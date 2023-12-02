import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import BigNumber from "bignumber.js";
import { BtcusdBinaryOptions__factory, OptionConfig__factory, RouterAbi__factory } from "common/abis/types";
import config from "common/config";
import { ContractName, PairContractName, PairContractType } from "common/constants/contract";
import { FEED_IDS } from "common/constants/price";
import { Network } from "common/enums/network.enum";
import { TRADE_STATE } from "common/enums/trades.enum";
import { EthersService } from "modules/_shared/services/ethers.service";
import { SocketPriceService } from "modules/_shared/services/socket-price.service";
import { LogsService } from "modules/logs/logs.service";
import { TradesDocument } from "modules/trades/schemas/trades.schema";
import { AddressZero } from "@ethersproject/constants";
import {
  CloseAnytimeSignature,
  MarketDirectionSignature,
  MarketDirectionSignatureWithSettlementFee,
  SettlementFeeSignature,
  UserTradeSignature,
  UserTradeSignatureWithSettlementFee,
  generateMessage,
} from "common/utils/signature";
import { SignerType } from "common/enums/signer.enum";
import { JOB_TIME } from "common/constants/trades";
import { TradesService } from "modules/trades/trades.service";

@Injectable()
export class JobTradeService {
  public listActives: TradesDocument[];
  public queueCloseAnytime: TradesDocument[];
  public queuesMarket: TradesDocument[];
  public queuesLimitOrder: TradesDocument[];
  public currentMaxOI: any;
  public currentIV: any;
  private isProcessingTradeMarket = false;
  private isProcessingTradeLimit = false;
  private isClosingTradesAnyTime = false;
  private isExcuteOption = false;

  constructor(
    private readonly socketPriceService: SocketPriceService,
    private readonly ethersService: EthersService,
    private readonly logsService: LogsService,
    @Inject(forwardRef(() => TradesService))
    private readonly tradesService: TradesService,
  ) {
    this.listActives = [];
    this.queueCloseAnytime = [];
    this.queuesMarket = [];
    this.queuesLimitOrder = [];
    this.currentMaxOI = {};
    this.currentIV = {};
    void this.start();
  }

  private async start() {
    await Promise.all([
      this.syncMaxOI(),
      this.syncIV(),
      this.cancelTrade(),
      this.tradesService.loadActiveTrades(),
      this.tradesService.loadTradesMarket(),
      this.tradesService.loadTradesLimitOrder(),
    ]);
  }

  @Cron(CronExpression.EVERY_5_SECONDS, { name: "cancelTrade" })
  private async cancelTrade() {
    const trades = await this.tradesService.findTradeByState(TRADE_STATE.QUEUED);
    console.log(">>> Trades QUEUED: " + trades.length);

    // cancel expired trades
    const tradesExpired: any = [];

    const now = new Date();
    trades.forEach((trade) => {
      // TODO:
      const expired = trade.limitOrderDuration !== 0 ? trade.limitOrderDuration : 60;
      if (trade.queuedDate && new Date(trade.queuedDate.getTime() + expired * 1000) < now) {
        tradesExpired.push({
          updateOne: {
            filter: {
              _id: trade._id,
              state: TRADE_STATE.QUEUED,
            },
            update: {
              $set: {
                state: TRADE_STATE.CANCELLED,
                isCancelled: true,
                cancellationReason: trade.limitOrderDuration !== 0 ? "Limit order expired" : "Hight wait time",
                cancellationDate: now,
              },
            },
          },
        });
        if (trade.limitOrderDuration !== 0) {
          const index = this.queuesLimitOrder.findIndex((a) => a.queueId === trade.queueId);
          if (index !== -1) {
            this.queuesLimitOrder.splice(index, 1);
          }
        } else {
          const index = this.queuesMarket.findIndex((a) => a.queueId === trade.queueId);
          if (index !== -1) {
            this.queuesMarket.splice(index, 1);
          }
        }
      }
    });

    //
    if (tradesExpired.length > 0) {
      console.log(">>> Trades change to CANCELED: " + tradesExpired.length);
      this.tradesService.bulkWrite(tradesExpired);
    }
  }

  @Cron(JOB_TIME.EVERY_3_SECONDS, { name: "TradeMarket" })
  private async processTradeMarket() {
    if (this.isProcessingTradeMarket) {
      console.log("[TradeMarket] Waiting for last job to finish...");
      return;
    }
    this.isProcessingTradeMarket = true;

    const pairPrice = this.socketPriceService.pairPrice;
    const now = new Date();
    try {
      if (pairPrice) {
        // TODO:
        const currentPrices = pairPrice[FEED_IDS[PairContractName.BTCUSD].replace("0x", "")];
        if (!currentPrices) {
          console.log("[TradeMarket] No priceUpdate, stopped...");
          this.isProcessingTradeMarket = false;
          return;
        }
        if (!this.queuesMarket.length) {
          console.log("[TradeMarket] No queuesMarket, stopped...");
          this.isProcessingTradeMarket = false;
          return;
        }

        console.log("[TradeMarket] Processing", this.queuesMarket.length, "tradesMarket...");
        const currentPrice = currentPrices[0];
        console.log(">>>", currentPrice);

        //log
        // this.logsService.createLog(
        //   "queuesMarket => before",
        //   this.queuesMarket.map((e) => e.queueId),
        // );

        // filter price with pair
        const trades = this.queuesMarket.splice(0, config.quantityTxTrade).map((item: any) => {
          const pricePair = item.pair
            ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
            : 0;
          const entryPrice = this.getPriceMarketAvaliable(
            item.strike,
            pricePair.map((p) => p.price),
            item.slippage,
          );
          return {
            ...item,
            openDate: now,
            price: entryPrice || 0,
            call_open: item.call_open + 1,
          };
        });

        if (!trades.length) {
          this.isProcessingTradeMarket = false;
          return;
        }

        // this.logsService.createLog(
        //   "queuesMarket => after",
        //   this.queuesMarket.map((e) => e.queueId),
        // );

        // Call smartcontract
        this.openTradeContract(trades);

        // update db
        this.tradesService.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                strike: BigNumber(item.price).toFixed(0),
                $inc: {
                  call_open: 1,
                },
              },
            },
          })),
        );
      }
    } catch (e) {
      console.error(e);
    }

    this.isProcessingTradeMarket = false;
  }

  @Cron(JOB_TIME.EVERY_3_SECONDS, { name: "TradeLimit" })
  private async processTradeLimit() {
    if (this.isProcessingTradeLimit) {
      console.log("[TradeLimit] Waiting for last job to finish...");
      return;
    }
    this.isProcessingTradeLimit = true;

    const pairPrice = this.socketPriceService.pairPrice;
    const now = new Date();
    try {
      if (pairPrice) {
        // TODO:
        const currentPrices = pairPrice[FEED_IDS[PairContractName.BTCUSD].replace("0x", "")];
        if (!currentPrices) {
          console.log("[TradeLimit] No priceUpdate, stopped...");
          this.isProcessingTradeLimit = false;
          return;
        }
        if (!this.queuesLimitOrder.length) {
          console.log("[TradeLimit] No queuesLimitOrder, stopped...");
          this.isProcessingTradeLimit = false;
          return;
        }

        console.log("[TradeLimit] Processing", this.queuesLimitOrder.length, "tradesLimit...");
        const currentPrice = currentPrices[0];
        console.log(">>>", currentPrice);

        // this.logsService.createLog(
        //   "queuesLimitOrder => before",
        //   this.queuesLimitOrder.map((e) => e.queueId),
        // );

        // filter price with pair
        const indexes: number[] = [];
        const trades: any[] = [];
        this.queuesLimitOrder.forEach((item: any, index) => {
          const pricePair = item.pair
            ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
            : [];
          const entryPrice = this.getLimitPriceAvaliable(
            item.strike.toString(),
            pricePair.map((p) => p.price),
            item.slippage,
          );
          if (entryPrice && indexes.length < config.quantityTxTrade) {
            indexes.push(index);
            trades.push({
              ...item,
              openDate: now,
              price: entryPrice || 0,
              call_open: item.call_open + 1,
            });
          }
        });

        if (!trades.length) {
          this.isProcessingTradeLimit = false;
          return;
        }

        // remove trade limit
        this.queuesLimitOrder = this.queuesLimitOrder.filter((item, index) => !indexes.includes(index));

        // this.logsService.createLog(
        //   "queuesLimitOrder => after",
        //   this.queuesLimitOrder.map((e) => e.queueId),
        // );

        // Call smartcontract
        this.openTradeContract(trades);

        // update db
        this.tradesService.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                strike: BigNumber(item.price).toFixed(0),
                openDate: now,
                $inc: {
                  call_open: 1,
                },
              },
            },
          })),
        );
      }
    } catch (e) {
      console.error(e);
    }

    this.isProcessingTradeLimit = false;
  }

  @Cron(JOB_TIME.EVERY_3_SECONDS, { name: "ExcuteOptions" })
  private async excuteOptions() {
    if (this.isExcuteOption) {
      console.log("[ExcuteOptions] Waiting for close last job to finish...");
      return;
    }
    this.isExcuteOption = true;

    const pairPrice = this.socketPriceService.pairPrice;
    const now = new Date();
    try {
      if (pairPrice) {
        // TODO:
        const currentPrices = pairPrice[FEED_IDS[PairContractName.BTCUSD].replace("0x", "")];
        if (!currentPrices) {
          console.log("[ExcuteOptions] No priceUpdate, stopped...");
          this.isExcuteOption = false;
          return;
        }

        if (!this.listActives.length) {
          console.log("[ExcuteOptions] No listActives, stopped...");
          this.isExcuteOption = false;
          return;
        }

        // this.logsService.createLog(
        //   "listActives => before",
        //   this.listActives.map((e) => `${e.queueId}_${e.optionId || ""}`),
        // );

        const indexes: number[] = [];
        const trades: any[] = [];

        // filter price with pair
        this.listActives.forEach((item: any, index) => {
          if (
            new Date(item.openDate.getTime() + item.period * 1000) <= now &&
            indexes.length < config.quantityTxTrade
          ) {
            indexes.push(index);
            const prices = item.pair
              ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
              : [];
            trades.push({
              ...item,
              price: prices[prices.length - 1].price || 0,
              call_close: item.call_close + 1,
            });
          }
        });
        if (!trades.length) {
          console.log("[ExcuteOptions] No listActives, stopped...");
          this.isExcuteOption = false;
          return;
        }
        console.log("[ExcuteOptions] Processing");

        if (!trades.length) {
          this.isExcuteOption = false;
          return;
        }

        // remove actives
        this.listActives = this.listActives.filter((item, index) => !indexes.includes(index));

        // this.logsService.createLog(
        //   "listActives => after",
        //   this.listActives.map((e) => `${e.queueId}_${e.optionId || ""}`),
        // );

        // Call smartcontract
        this.excuteOptionContract(trades);

        // update db
        this.tradesService.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                expiryPrice: BigNumber(item.price).toFixed(0),
                $inc: {
                  call_close: 1,
                },
              },
            },
          })),
        );
      }
    } catch (e) {
      console.error(e);
    }

    this.isExcuteOption = false;
  }

  @Cron(JOB_TIME.EVERY_3_SECONDS, { name: "CloseTradesAnyTime" })
  private async closeTradesAnyTime() {
    if (this.isClosingTradesAnyTime) {
      console.log("[CloseTradesAnyTime] Waiting for close last job to finish...");
      return;
    }
    this.isClosingTradesAnyTime = true;

    const pairPrice = this.socketPriceService.pairPrice;
    try {
      if (pairPrice) {
        // TODO:
        const currentPrices = pairPrice[FEED_IDS[PairContractName.BTCUSD].replace("0x", "")];
        if (!currentPrices) {
          console.log("[CloseTradesAnyTIme] No priceUpdate, stopped...");
          this.isClosingTradesAnyTime = false;
          return;
        }
        if (!this.queueCloseAnytime.length) {
          console.log("[CloseTradesAnyTIme] No listActives, stopped...");
          this.isClosingTradesAnyTime = false;
          return;
        }

        console.log("[CloseTradesAnyTIme] Processing");

        this.logsService.createLog(
          "CloseTradesAnyTIme => before",
          this.queueCloseAnytime.map((e) => `${e.queueId}_${e.optionId || ""}`),
        );

        // filter price with pair
        const trades = this.queueCloseAnytime.splice(0, config.quantityTxTrade).map((item: any) => {
          const prices = item.pair
            ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
            : [];
          return {
            ...item,
            price: prices[prices.length - 1].price || 0,
            call_close: item.call_close + 1,
          };
        });

        if (!trades.length) {
          this.isClosingTradesAnyTime = false;
          return;
        }

        this.logsService.createLog(
          "CloseTradesAnyTIme => after",
          this.queueCloseAnytime.map((e) => `${e.queueId}_${e.optionId || ""}`),
        );

        // Call smartcontract
        this.closeTradeContract(trades);

        // update db
        this.tradesService.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                expiryPrice: BigNumber(item.price).toFixed(0),
                $inc: {
                  call_close: 1,
                },
              },
            },
          })),
        );
      }
    } catch (e) {
      console.error(e);
    }

    this.isClosingTradesAnyTime = false;
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: "syncMaxOI" })
  async syncMaxOI() {
    const network = config.isDevelopment ? Network.goerli : Network.base;
    Object.values(PairContractName).forEach(async (pair) => {
      try {
        const pairContractName = pair.replace(/[^a-zA-Z]/, "").toUpperCase() as PairContractName;
        const contractInfo = config.getPairContract(network, pairContractName, PairContractType.BINARY_OPTION);
        const contract = this.ethersService.getContract(
          network,
          contractInfo.address,
          BtcusdBinaryOptions__factory.abi,
        );
        const amount = await contract.getMaxOI();
        this.currentMaxOI[pairContractName] = BigNumber(amount.toString()).toFixed(0);
      } catch (e) {
        console.log(e);
      }
    });
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: "syncIV" })
  async syncIV() {
    const network = config.isDevelopment ? Network.goerli : Network.base;
    Object.values(PairContractName).forEach(async (pair) => {
      try {
        const pairContractName = pair.replace(/[^a-zA-Z]/, "").toUpperCase() as PairContractName;
        const contractBinaryInfo = config.getPairContract(network, pairContractName, PairContractType.BINARY_OPTION);
        const contractConfigInfo = config.getPairContract(network, pairContractName, PairContractType.CONFIG_OPTION);
        const contractBinary = this.ethersService.getContract(
          network,
          contractBinaryInfo.address,
          BtcusdBinaryOptions__factory.abi,
        );
        const contractConfig = this.ethersService.getContract(
          network,
          contractConfigInfo.address,
          OptionConfig__factory.abi,
        );
        const [iv, ivFactorITM, ivFactorOTM] = await Promise.all([
          contractConfig.iv(),
          contractBinary.ivFactorITM(),
          contractBinary.ivFactorOTM(),
        ]);
        this.currentIV[pairContractName] = {
          IV: iv.toString() || "1384",
          IVFactorOTM: ivFactorOTM.toString() || "50",
          IVFactorITM: ivFactorITM.toString() || "1000",
        };
      } catch (e) {
        this.logsService.createLog("syncIV", e);
      }
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "syncBalanceOperator" })
  async syncBalanceOperator() {
    try {
      // const operaters = await this.getBalanceOperator();
    } catch (e) {
      console.log(e);
    }
  }

  // choose operater
  private async openTradeContract(trades: any[]) {
    //log
    this.logsService.createLog(
      "trades => openTradeContract",
      trades.map((e) => e.queueId),
    );

    // choose operater
    const operater = this.chooseOperator();
    const network = trades[0].network;
    const now = new Date();
    try {
      // get contract
      const contract = this.ethersService.getContractWithProvider(
        network,
        config.getContract(network, ContractName.ROUTER).address,
        RouterAbi__factory.abi,
        this.ethersService.getWallet(operater, network),
      );

      const openTxn: any[] = [];
      await Promise.all(
        trades.map(async (trade, index) => {
          const timestamp = Math.floor(now.getTime() / 1000) - index;
          //
          const messageSettlementFeeSignature = {
            assetPair: trade.pair.replace("-", "").toUpperCase(),
            expiryTimestamp: timestamp + 86400,
            settlementFee: trade.settlementFee,
          };

          // userPartialSignatures
          let messageUserPartialSignature: any = {
            user: trade.userAddress,
            totalFee: trade.tradeSize,
            period: trade.period,
            targetContract: trade.targetContract,
            strike: BigNumber(trade.strikeOld).toFixed(0),
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode || "",
            timestamp,
          };
          if (!trade.isLimitOrder) {
            messageUserPartialSignature = {
              ...messageUserPartialSignature,
              settlementFee: trade.settlementFee,
            };
          }

          //userFullSignature
          const userFullMessage = generateMessage(
            trade.pair.replace("-", "").toUpperCase(),
            timestamp.toString(),
            BigNumber(trade.price).toFixed(0),
          );

          const [settlementFeeSignature, userPartialSignature, userFullSignature] = await Promise.all([
            this.ethersService.signTypeData(
              network,
              SignerType.sfPublisher,
              config.getContract(network, ContractName.ROUTER).address,
              SettlementFeeSignature,
              messageSettlementFeeSignature,
            ),
            this.ethersService.signTypeDataWithSinger(
              network,
              this.ethersService.getWallet(trade.privateKeyOneCT, network),
              config.getContract(network, ContractName.ROUTER).address,
              trade.isLimitOrder ? UserTradeSignature : UserTradeSignatureWithSettlementFee,
              messageUserPartialSignature,
            ),
            this.ethersService.signMessage(network, SignerType.publisher, userFullMessage),
          ]);

          openTxn.push({
            tradeParams: {
              queueId: trade.queueId,
              totalFee: trade.tradeSize,
              period: trade.period,
              targetContract: trade.targetContract,
              strike: BigNumber(trade.strikeOld).toFixed(0),
              slippage: trade.slippage,
              allowPartialFill: trade.allowPartialFill || false,
              referralCode: trade.referralCode || "",
              isAbove: trade.isAbove,
              price: BigNumber(trade.price).toFixed(0),
              settlementFee: trade.settlementFee,
              isLimitOrder: trade.isLimitOrder,
              limitOrderExpiry: trade.isLimitOrder ? timestamp + 86400 : 0,
              userSignedSettlementFee: 500,
              settlementFeeSignInfo: {
                timestamp: timestamp + 86400,
                signature: settlementFeeSignature,
              },
              userSignInfo: {
                timestamp: timestamp,
                signature: userPartialSignature,
              },
              publisherSignInfo: {
                timestamp: timestamp,
                signature: userFullSignature,
              },
            },
            register: {
              oneCT: AddressZero,
              signature: "0x",
              shouldRegister: false,
            },
            permit: {
              value: 0,
              deadline: 0,
              v: 0,
              r: "0x0000000000000000000000000000000000000000000000000000000000000000",
              s: "0x0000000000000000000000000000000000000000000000000000000000000000",
              shouldApprove: false,
            },
            user: trade.userAddress,
          });
        }),
      );

      // gas estimate
      // const gasLimit = await contract.estimateGas.openTrades(openTxn, {
      //   gasPrice: this.ethersService.getCurrentGas(network),
      // });
      // write contract
      await contract.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
        gasLimit: "10000000",
      });

      this.listActives.push(...trades);
    } catch (e) {
      const _tradeRetry = trades.filter((trade) => trade.call_open <= config.maximumRetry);
      const _tradeCancelled = trades.filter((trade) => trade.call_open > config.maximumRetry);
      if (_tradeRetry.length) {
        //  switch rpc
        this.ethersService.switchRPC(network);

        const _trades = _tradeRetry.map((trade) => {
          return { ...trade, call_open: trade.call_open + 1 };
        });
        if (trades[0].isLimitOrder) {
          this.queuesLimitOrder.push(..._trades);
        } else {
          this.queuesMarket.push(..._trades);
        }
        this.logsService.createLog(
          "openTradeContract => retry",
          _tradeRetry.map((e) => e.queueId),
        );
      }
      if (_tradeCancelled.length) {
        this.tradesService.bulkWrite(
          _tradeCancelled.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                state: TRADE_STATE.CANCELLED,
                isCancelled: true,
                cancellationReason: "Blockchain is busy",
                cancellationDate: now,
              },
            },
          })),
        );
        this.logsService.createLog(
          "openTradeContract => cancel",
          _tradeCancelled.map((e) => e.queueId),
        );
        this.logsService.createLog("openTradeContract => error", e);
      }
    }
  }

  private async excuteOptionContract(trades: any[]) {
    //log
    this.logsService.createLog(
      "trades => excuteOptionContract",
      trades.map((e) => `${e.queueId}_${e.optionId || ""}`),
    );

    // choose operater
    const operater = this.chooseOperator();
    const network = trades[0].network;
    const optionData: any[] = [];
    try {
      // get contract
      const contract = this.ethersService.getContractWithProvider(
        network,
        config.getContract(network, ContractName.ROUTER).address,
        RouterAbi__factory.abi,
        this.ethersService.getWallet(operater, network),
      );

      const now = new Date();
      await Promise.all(
        trades.map(async (trade) => {
          // userPartialSignatures
          let messageUserPartialSignature: any = {
            user: trade.userAddress,
            totalFee: trade.tradeSize,
            period: trade.period,
            targetContract: trade.targetContract,
            strike: BigNumber(trade.strikeOld).toFixed(0),
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode || "",
            isAbove: trade.isAbove,
            timestamp: Math.floor(now.getTime() / 1000),
          };
          if (!trade.isLimitOrderOld) {
            messageUserPartialSignature = {
              ...messageUserPartialSignature,
              settlementFee: trade.settlementFee,
            };
          }

          //userFullSignature
          const userFullMessage = generateMessage(
            trade.pair.replace("-", "").toUpperCase(),
            trade.expirationDate || Math.floor(now.getTime() / 1000),
            BigNumber(trade.price).toFixed(0),
          );

          const [userPartialSignature, userFullSignature] = await Promise.all([
            this.ethersService.signTypeDataWithSinger(
              network,
              this.ethersService.getWallet(trade.privateKeyOneCT, network),
              config.getContract(network, ContractName.ROUTER).address,
              trade.isLimitOrderOld ? MarketDirectionSignature : MarketDirectionSignatureWithSettlementFee,
              messageUserPartialSignature,
            ),
            this.ethersService.signMessage(network, SignerType.publisher, userFullMessage),
          ]);

          //log
          this.logsService.createLog("userPartialSignature", trade.optionId || "", trade.privateKeyOneCT);

          optionData.push({
            optionId: trade.optionId || 0,
            targetContract: trade.targetContract,
            closingPrice: BigNumber(trade.price).toFixed(0),
            isAbove: trade.isAbove,
            marketDirectionSignInfo: {
              timestamp: Math.floor(now.getTime() / 1000),
              signature: userPartialSignature,
            },
            publisherSignInfo: {
              timestamp: trade.expirationDate || Math.floor(now.getTime() / 1000),
              signature: userFullSignature,
            },
          });
        }),
      );

      // gas estimate
      const gasLimit = await contract.estimateGas.executeOptions(optionData, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.executeOptions(optionData, {
        gasPrice: this.ethersService.getCurrentGas(network),
        gasLimit: BigNumber(gasLimit.toString()).multipliedBy(3).toFixed(0),
      });
    } catch (e) {
      const _tradeRetry = trades.filter((trade) => trade.call_close <= config.maximumRetry);
      if (_tradeRetry.length) {
        //  switch rpc
        this.ethersService.switchRPC(network);

        const _trades = _tradeRetry.map((trade) => {
          return { ...trade, call_close: trade.call_close + 1 };
        });
        this.listActives.push(..._trades);
        this.logsService.createLog(
          "excuteOptionContract => retry",
          _tradeRetry.map((e) => `${e.queueId}_${e.optionId || ""}`),
        );
      } else {
        this.logsService.createLog(
          "excuteOptionContract => error",
          trades.map((e) => `${e.queueId}_${e.optionId || ""}`),
        );
        this.logsService.createLog("excuteOptionContract => error", e);
      }
    }
  }

  private async closeTradeContract(trades: any[]) {
    //log
    this.logsService.createLog(
      "trades => closeTradeContract",
      trades.map((e) => `${e.queueId}_${e.optionId || ""}`),
    );

    // choose operater
    const operater = this.chooseOperator();
    const network = trades[0].network;
    try {
      // get contract
      const contract = this.ethersService.getContractWithProvider(
        network,
        config.getContract(network, ContractName.ROUTER).address,
        RouterAbi__factory.abi,
        this.ethersService.getWallet(operater, network),
      );

      const closeParams: any[] = [];
      const now = new Date();
      await Promise.all(
        trades.map(async (trade) => {
          // userPartialSignatures
          let messageUserPartialSignature: any = {
            user: trade.userAddress,
            totalFee: trade.tradeSize,
            period: trade.period,
            targetContract: trade.targetContract,
            strike: BigNumber(trade.strikeOld).toFixed(0),
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode || "",
            isAbove: trade.isAbove,
            timestamp: Math.floor(now.getTime() / 1000),
          };
          if (!trade.isLimitOrderOld) {
            messageUserPartialSignature = {
              ...messageUserPartialSignature,
              settlementFee: trade.settlementFee,
            };
          }
          const messageUserSignInfo = {
            assetPair: trade.pair.replace("-", "").toUpperCase(),
            timestamp: trade.closingTime || 0,
            optionId: trade.optionId || 0,
          };

          //userFullSignature
          const userFullMessage = generateMessage(
            trade.pair.replace("-", "").toUpperCase(),
            Math.floor(now.getTime() / 1000).toString(),
            BigNumber(trade.price).toFixed(0),
          );

          const [userPartialSignature, userSignerInfo, userFullSignature] = await Promise.all([
            this.ethersService.signTypeDataWithSinger(
              network,
              this.ethersService.getWallet(trade.privateKeyOneCT, network),
              config.getContract(network, ContractName.ROUTER).address,
              trade.isLimitOrderOld ? MarketDirectionSignature : MarketDirectionSignatureWithSettlementFee,
              messageUserPartialSignature,
            ),
            this.ethersService.signTypeDataWithSinger(
              network,
              this.ethersService.getWallet(trade.privateKeyOneCT, network),
              config.getContract(network, ContractName.ROUTER).address,
              CloseAnytimeSignature,
              messageUserSignInfo,
            ),
            this.ethersService.signMessage(network, SignerType.publisher, userFullMessage),
          ]);

          closeParams.push({
            closeTradeParams: {
              optionId: trade.optionId,
              targetContract: trade.targetContract,
              closingPrice: BigNumber(trade.price).toFixed(0),
              isAbove: trade.isAbove,
              marketDirectionSignInfo: {
                timestamp: Math.floor(now.getTime() / 1000),
                signature: userPartialSignature,
              },
              publisherSignInfo: {
                timestamp: Math.floor(now.getTime() / 1000),
                signature: userFullSignature,
              },
            },
            register: {
              oneCT: AddressZero,
              signature: "0x",
              shouldRegister: false,
            },
            userSignInfo: {
              timestamp: trade.closingTime || 0,
              signature: userSignerInfo,
            },
          });
        }),
      );

      // gas estimate
      const gasLimit = await contract.estimateGas.closeAnytime(closeParams, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.closeAnytime(closeParams, {
        gasPrice: this.ethersService.getCurrentGas(network),
        gasLimit: BigNumber(gasLimit.toString()).multipliedBy(3).toFixed(0),
      });
    } catch (e) {
      const _tradeRetry = trades.filter((trade) => trade.call_close <= config.maximumRetry);
      if (_tradeRetry.length) {
        //  switch rpc
        this.ethersService.switchRPC(network);

        const _trades = _tradeRetry.map((trade) => {
          return { ...trade, call_close: trade.call_close + 1 };
        });
        this.queueCloseAnytime.push(..._trades);
        this.logsService.createLog(
          "closeTradeContract => retry",
          _tradeRetry.map((e) => `${e.queueId}_${e.optionId || ""}`),
        );
      } else {
        this.logsService.createLog("closeTradeContract", e);
      }
    }
  }

  private choosingIndex = 0;
  private chooseOperator() {
    this.choosingIndex = (this.choosingIndex + 1) % 5;
    return config.listOperater[this.choosingIndex];
  }

  async getBalanceOperator() {
    const operaters: any[] = [];
    try {
      const network = config.isDevelopment ? Network.goerli : Network.base;
      const promiseCall: any[] = [];
      for (const account of config.listAddressOperater) {
        promiseCall.push(this.ethersService.getBalance(account, network));
      }
      const res = await Promise.all(promiseCall);
      config.listAddressOperater.forEach((account, i) => {
        if (BigNumber(res[i].toString()).lte("100000000000000000")) {
          operaters.push(config.listOperater[i]);
        }
      });
    } catch (e) {
      console.log(e);
    }
    return operaters;
  }

  private getLimitPriceAvaliable(triggerPrice: string, prices: string[], slippage: number) {
    for (const price of prices) {
      if (this.checkSlippage(triggerPrice, price, slippage)) {
        return price;
      }
    }
    return;
  }

  private getPriceMarketAvaliable(strikePrice: string, prices: string[], slippage: number) {
    for (const price of prices) {
      if (this.checkSlippage(strikePrice, price, slippage)) {
        return price;
      }
    }
    return prices[prices.length - 1];
  }

  private checkSlippage(strikePrice: string, price: string, slippage: number) {
    return (
      Number(price) >= (Number(strikePrice) * (1e4 - slippage)) / 1e4 &&
      Number(price) <= (Number(strikePrice) * (1e4 + slippage)) / 1e4
    );
  }
}
