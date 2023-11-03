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
  MarketDirectionSignature,
  MarketDirectionSignatureWithSettlementFee,
  SettlementFeeSignature,
  UserTradeSignature,
  UserTradeSignatureWithSettlementFee,
  generateMessage,
} from "common/utils/signature";
import { SignerType } from "common/enums/signer.enum";
import { decryptAES } from "common/utils/encrypt";

@Injectable()
export class JobTradeService {
  public listActives: TradesDocument[] = [];
  public queueCloseAnytime: TradesDocument[] = [];
  public queuesMarket: TradesDocument[] = [];
  public queuesLimitOrder: TradesDocument[] = [];
  public stateOperators: any = {};
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
            return this.checkLimitPriceAvaliable(item.strike.toString(), prices, item.isAbove);
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

        // remove trade limit
        indexes.splice(0, config.quantityTxTrade).forEach((item) => this.queuesLimitOrder.splice(item, 1));

        if (!_trades.length) {
          this.isProcessingTradeLimit = false;
          return;
        }

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
            trade.price,
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
              price: trade.price,
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
      await contract.estimateGas.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });

      this.listActives.push(...trades);
    } catch (e) {
      if (e.match("nonce has already been used")) {
        if(trades[0].isLimitOrder){
          this.queuesLimitOrder.push(...trades);
        } else {
          this.queuesMarket.push(...trades);
        }
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
        this.logsService.createLog("openTradeContract", e);
      }
    } finally {
      delete this.stateOperators[operater];
    }
  }

  private async excuteOptionContract(trades: any[]) {
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

      const closeTxn: any[] = [];
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
            trade.expirationDate,
            trade.price,
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

          closeTxn.push({
            optionId: trade.optionId,
            targetContract: trade.targetContract,
            closingPrice: trade.price,
            isAbove: trade.isAbove,
            marketDirectionSignInfo: {
              timestamp: Math.floor(now.getTime() / 1000),
              signature: userPartialSignature,
            },
            publisherSignInfo: {
              timestamp: trade.expirationDate,
              signature: userFullSignature,
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
          });
        }),
      );

      // gas estimate
      await contract.estimateGas.executeOptions(closeTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.executeOptions(closeTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
    } catch (e) {
      if (e.match("nonce has already been used")) {
        this.listActives.push(...trades);
      } else {
        this.logsService.createLog("excuteOptionContract", e);
      }
    } finally {
      delete this.stateOperators[operater];
    }
  }

  private async closeTradeContract(trades: any[]) {
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

      const closeAnyTimeTxn: any[] = [];
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
            trade.expirationDate,
            trade.price,
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

          closeAnyTimeTxn.push({
            closeTradeParams: {
              optionId: trade.optionId,
              targetContract: trade.targetContract,
              closingPrice: trade.price,
              isAbove: trade.isAbove,
              marketDirectionSignInfo: {
                timestamp: Math.floor(now.getTime() / 1000),
                signature: userPartialSignature,
              },
              publisherSignInfo: {
                timestamp: trade.expirationDate,
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
          });
        }),
      );

      // gas estimate
      await contract.estimateGas.closeAnytime(closeAnyTimeTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.closeAnytime(closeAnyTimeTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
    } catch (e) {
      this.logsService.createLog("closeTradeContract", e);
    } finally {
      delete this.stateOperators[operater];
    }
  }

  private chooseOperator() {
    let operaterMinTime = config.listOperater[1];
    let minTime = 9000000000000000;
    config.listOperater.forEach((o) => {
      if (!this.stateOperators[o]) {
        this.stateOperators[o] = new Date().getTime();
        return o;
      }
      if (minTime > this.stateOperators[o]) {
        minTime = this.stateOperators[o];
        operaterMinTime = o;
      }
    });
    this.logsService.createLog("stateOperators", JSON.stringify(this.stateOperators));
    return operaterMinTime;
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

  private checkLimitPriceAvaliable(targetPrice: string, prices: string[], up: boolean) {
    return (
      (prices.some((price) => BigNumber(price).gte(targetPrice)) &&
        prices.some((price) => BigNumber(price).lte(targetPrice))) ||
      (up && prices.every((price) => BigNumber(price).gte(targetPrice))) ||
      (!up && prices.every((price) => BigNumber(price).lte(targetPrice)))
    );
  }
}
