import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import BigNumber from "bignumber.js";
import { RouterAbi__factory } from "common/abis/types";
import config from "common/config";
import { ContractName, PairContractName } from "common/constants/contract";
import { FEED_IDS } from "common/constants/price";
import { Network } from "common/enums/network.enum";
import { TRADE_STATE } from "common/enums/trades.enum";
import { EthersService } from "modules/_shared/services/ethers.service";
import { SocketPriceService } from "modules/_shared/services/socket-price.service";
import { LogsService } from "modules/logs/logs.service";
import { TRADES_MODEL, TradesDocument } from "modules/trades/schemas/trades.schema";
import { AddressZero } from "@ethersproject/constants";
import { PaginateModel } from "mongoose";
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
import { decryptAES } from "common/utils/encrypt";
import { ERROR_RETRY } from "common/constants/event";

@Injectable()
export class JobTradeService {
  public listActives: TradesDocument[];
  public queueCloseAnytime: TradesDocument[];
  public queuesMarket: TradesDocument[];
  public queuesLimitOrder: TradesDocument[];
  private isProcessingTradeMarket = false;
  private isProcessingTradeLimit = false;
  private isClosingTradesAnyTime = false;
  private isExcuteOption = false;

  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly tradesModel: PaginateModel<TradesDocument>,
    private readonly socketPriceService: SocketPriceService,
    private readonly ethersService: EthersService,
    private readonly logsService: LogsService,
  ) {
    this.listActives = [];
    this.queueCloseAnytime = [];
    this.queuesMarket = [];
    this.queuesLimitOrder = [];
    this.start();
  }

  private async start() {
    await this.cancelTrade();
    this.loadActiveTrades();
    this.loadTradesMarket();
    this.loadTradesLimitOrder();
  }

  private async loadActiveTrades() {
    let trades = await this.tradesModel.aggregate([
      {
        $match: {
          state: TRADE_STATE.OPENED,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (trades.length) {
      console.log("[ActiveTrade] Loaded", trades.length, "activeTrade to listActives");
      trades = trades
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.listActives.push(...trades);
    }
  }

  private async loadTradesMarket() {
    let trades = await this.tradesModel.aggregate([
      {
        $match: {
          state: TRADE_STATE.QUEUED,
          isLimitOrder: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (trades.length) {
      console.log("[TradeMarket] Loaded", trades.length, "tradesMarket to queues");
      trades = trades
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.queuesMarket.push(...trades);
    }
  }

  private async loadTradesLimitOrder() {
    let trades = await this.tradesModel.aggregate([
      {
        $match: {
          state: TRADE_STATE.QUEUED,
          isLimitOrder: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (trades.length) {
      console.log("[TradeMarket] Loaded", trades.length, "tradesMarket to queues");
      trades = trades
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.queuesLimitOrder.push(...trades);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async cancelTrade() {
    const trades = await this.tradesModel.find({
      state: TRADE_STATE.QUEUED,
    });
    console.log(">>> Trades QUEUED: " + trades.length);

    // cancel expired trades
    const tradesExpired: any = [];

    const now = new Date();
    trades.forEach((trade) => {
      // TODO:
      const expired = trade.limitOrderDuration !== 0 ? trade.limitOrderDuration : 60;
      if (trade.openDate && new Date(trade.openDate.getTime() + expired * 1000) < now) {
        tradesExpired.push({
          updateOne: {
            filter: {
              _id: trade._id,
            },
            update: {
              $set: {
                state: TRADE_STATE.CANCELLED,
                isCancelled: true,
                cancellationReason: "The trade reached overtime",
                cancellationDate: now,
                // closeDate: now,
              },
            },
          },
        });
      }
    });

    //
    if (tradesExpired.length > 0) {
      console.log(">>> Trades change to CANCELED: " + tradesExpired.length);
      this.tradesModel.bulkWrite(tradesExpired);
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
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

        // filter price with pair
        const trades = this.queuesMarket.splice(0, config.quantityTxTrade).map((item: any) => {
          const prices = item.pair
            ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
            : 0;
          const entryPrice = prices[prices.length - 1].price;
          return {
            ...item,
            openDate: now,
            price: entryPrice,
          };
        });

        if (!trades.length) {
          this.isProcessingTradeMarket = false;
          return;
        }

        // Call smartcontract
        this.openTradeContract(trades);

        // update db
        this.tradesModel.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                state: TRADE_STATE.OPENED,
                expiryPrice: BigNumber(item.price).toFixed(0),
                openDate: now,
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

  @Cron(CronExpression.EVERY_SECOND)
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

        // filter price with pair
        const indexes: number[] = [];
        const trades = this.queuesLimitOrder
          .filter((item: any, index) => {
            let prices = item.pair
              ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
              : [];
            prices = prices.map((price) => price.price);
            indexes.push(index);
            return this.checkLimitPriceAvaliable(item.strike.toString(), prices, item.isAbove, item.slippage);
          })
          .map((item: any) => {
            const prices = item.pair
              ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
              : [];
            const entryPrice = prices[prices.length - 1].price || 0;
            return {
              ...item,
              openDate: now,
              price: entryPrice,
            };
          });

        // Call smartcontract
        const _trades = trades.slice(0, config.quantityTxTrade);

        if (!_trades.length) {
          this.isProcessingTradeLimit = false;
          return;
        }

        // remove trade limit
        indexes.splice(0, config.quantityTxTrade).forEach((item) => this.queuesLimitOrder.splice(item, 1));

        // Call smartcontract
        this.openTradeContract(_trades);

        // update db
        this.tradesModel.bulkWrite(
          _trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                state: TRADE_STATE.OPENED,
                expiryPrice: BigNumber(item.price).toFixed(0),
                openDate: now,
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

  @Cron(CronExpression.EVERY_SECOND)
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
        const indexes: number[] = [];
        const listTrades = this.listActives.filter((item, index) => {
          if (new Date(item.openDate.getTime() + item.period * 1000) <= now) {
            indexes.push(index);
            return true;
          }
          return false;
        });
        if (!listTrades.length) {
          console.log("[ExcuteOptions] No listActives, stopped...");
          this.isExcuteOption = false;
          return;
        }

        console.log("[ExcuteOptions] Processing");

        // filter price with pair
        const trades = listTrades.splice(0, config.quantityTxTrade).map((item: any) => {
          const prices = item.pair
            ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
            : [];
          return {
            ...item,
            price: prices[prices.length - 1].price || 0,
          };
        });
        // remove actives
        indexes.splice(0, config.quantityTxTrade).forEach((item) => this.listActives.splice(item, 1));

        if (!trades.length) {
          this.isExcuteOption = false;
          return;
        }

        // Call smartcontract
        this.excuteOptionContract(trades);

        // update db
        this.tradesModel.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                state: TRADE_STATE.CLOSED,
                expiryPrice: BigNumber(item.price).toFixed(0),
                closeDate: now,
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

  @Cron(CronExpression.EVERY_SECOND)
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

        // filter price with pair
        const trades = this.queueCloseAnytime.splice(0, config.quantityTxTrade).map((item: any) => {
          const prices = item.pair
            ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")]
            : [];
          return {
            ...item,
            price: prices[prices.length - 1].price || 0,
          };
        });

        if (!trades.length) {
          this.isClosingTradesAnyTime = false;
          return;
        }

        // Call smartcontract
        this.closeTradeContract(trades);

        // update db
        this.tradesModel.bulkWrite(
          trades.map((item) => ({
            updateOne: {
              filter: {
                _id: item._id,
              },
              update: {
                expiryPrice: BigNumber(item.price).toFixed(0),
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
      "trades => market",
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
        trades.map(async (trade) => {
          //
          const messageSettlementFeeSignature = {
            assetPair: trade.pair.replace("-", "").toUpperCase(),
            expiryTimestamp: Math.floor(86400 + now.getTime() / 1000),
            settlementFee: trade.settlementFee,
          };

          // userPartialSignatures
          let messageUserPartialSignature: any = {
            user: trade.userAddress,
            totalFee: trade.tradeSize,
            period: trade.period,
            targetContract: trade.targetContract,
            strike: trade.strike.toFixed(0),
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode || "",
            timestamp: Math.floor(now.getTime() / 1000),
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
            Math.floor(now.getTime() / 1000).toString(),
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
              strike: trade.strike.toFixed(0),
              slippage: trade.slippage,
              allowPartialFill: trade.allowPartialFill || false,
              referralCode: trade.referralCode || "",
              isAbove: trade.isAbove,
              price: BigNumber(trade.price).toFixed(0),
              settlementFee: trade.settlementFee,
              isLimitOrder: trade.isLimitOrder,
              limitOrderExpiry: trade.isLimitOrder ? Math.floor(now.getTime() / 1000 + 86400) : 0,
              userSignedSettlementFee: 500,
              settlementFeeSignInfo: {
                timestamp: Math.floor(86400 + now.getTime() / 1000),
                signature: settlementFeeSignature,
              },
              userSignInfo: {
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
      const gasLimit = await contract.estimateGas.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
        gasLimit: BigNumber(gasLimit.toString()).multipliedBy(1.1).toFixed(0),
      });

      this.listActives.push(...trades);
    } catch (e) {
      if (e.reason && Object.values(ERROR_RETRY).includes(e.reason)) {
        if (trades[0].isLimitOrder) {
          this.queuesLimitOrder.push(...trades);
        } else {
          this.queuesMarket.push(...trades);
        }
        this.logsService.createLog("openTradeContract => retry", e);
      } else {
        this.tradesModel.bulkWrite(
          trades.map((item) => ({
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
        this.logsService.createLog("openTradeContract => cancel", e);
      }
    }
  }

  private async excuteOptionContract(trades: any[]) {
    //log
    this.logsService.createLog(
      "trades => market",
      trades.map((e) => {
        return {
          queueId: e.queueId,
          optionId: e.optionId || "",
          expirationDate: e.expirationDate || "",
        };
      }),
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
            strike: trade.strike,
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode || "",
            isAbove: trade.isAbove,
            timestamp: Math.floor(now.getTime() / 1000),
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
            trade.expirationDate || Math.floor(now.getTime() / 1000),
            BigNumber(trade.price).toFixed(0),
          );

          const [userPartialSignature, userFullSignature] = await Promise.all([
            this.ethersService.signTypeDataWithSinger(
              network,
              this.ethersService.getWallet(trade.privateKeyOneCT, network),
              config.getContract(network, ContractName.ROUTER).address,
              trade.isLimitOrder ? MarketDirectionSignature : MarketDirectionSignatureWithSettlementFee,
              messageUserPartialSignature,
            ),
            this.ethersService.signMessage(network, SignerType.publisher, userFullMessage),
          ]);

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
        gasLimit: BigNumber(gasLimit.toString()).multipliedBy(1.3).toFixed(0),
      });
    } catch (e) {
      if (e.reason && Object.values(ERROR_RETRY).includes(e.reason)) {
        this.listActives.push(...trades);
      } else {
        this.logsService.createLog("excuteOptionContract", e);
        this.logsService.createLog("optionData", JSON.stringify(optionData));
      }
    }
  }

  private async closeTradeContract(trades: any[]) {
    //log
    this.logsService.createLog(
      "trades => market",
      trades.map((e) => e.queueId),
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
            strike: trade.strike,
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode || "",
            isAbove: trade.isAbove,
            timestamp: Math.floor(now.getTime() / 1000),
          };
          if (!trade.isLimitOrder) {
            messageUserPartialSignature = {
              ...messageUserPartialSignature,
              settlementFee: trade.settlementFee,
            };
          }
          const messageUserSignInfo = {
            assetPair: trade.pair.replace("-", "").toUpperCase(),
            timestamp: Math.floor(now.getTime() / 1000),
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
              trade.isLimitOrder ? MarketDirectionSignature : MarketDirectionSignatureWithSettlementFee,
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
              timestamp: Math.floor(now.getTime() / 1000),
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
        gasLimit: BigNumber(gasLimit.toString()).multipliedBy(1.1).toFixed(0),
      });
    } catch (e) {
      if (e.reason && Object.values(ERROR_RETRY).includes(e.reason)) {
        this.queueCloseAnytime.push(...trades);
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

  private checkLimitPriceAvaliable(targetPrice: string, prices: string[], up: boolean, slippage: number) {
    return (
      (prices.some((price) => BigNumber(price).gte(targetPrice)) &&
        prices.some((price) => BigNumber(price).lte(targetPrice))) ||
      (!up &&
        Number(prices[prices.length - 1]) <= (Number(targetPrice) * (1e4 + slippage)) / 1e4 &&
        Number(prices[prices.length - 1]) >= Number(targetPrice)) ||
      (up &&
        Number(prices[prices.length - 1]) >= (Number(targetPrice) * (1e4 - slippage)) / 1e4 &&
        Number(prices[prices.length - 1]) <= Number(targetPrice))
    );
  }
}
