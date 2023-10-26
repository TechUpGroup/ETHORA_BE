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

@Injectable()
export class JobTradeService {
  public queuesMarket: TradesDocument[] = [];
  public queuesLimitOrder: TradesDocument[] = [];
  public stateOperators: any = {};
  private isProcessingTradeMarket = false;
  private isProcessingSyncBalance = false;

  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly tradesModel: PaginateModel<TradesDocument>,
    private readonly socketPriceService: SocketPriceService,
    private readonly ethersService: EthersService,
    private readonly logsService: LogsService,
  ) {
    this.loadTradesMarket();
    this.loadTradesLimitOrder();
  }

  private async loadTradesMarket() {
    const trades = await this.tradesModel.find({
      state: TRADE_STATE.OPENED,
      isLimitOrder: false,
    });
    if (trades.length) {
      console.log("[TradeMarket] Loaded", trades.length, "tradesMarket to queues");
      this.queuesMarket.push(...trades);
    }
  }

  private async loadTradesLimitOrder() {
    const trades = await this.tradesModel.find({
      state: TRADE_STATE.QUEUED,
      isLimitOrder: false,
    });
    if (trades.length) {
      this.queuesLimitOrder.push(...trades);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {
    const trades = await this.tradesModel.find({
      state: TRADE_STATE.QUEUED,
    });
    console.log(">>> Trades QUEUED: " + trades.length);

    // cancel expired trades
    const tradesExpired: any = [];

    const now = new Date();
    trades.forEach((trade) => {
      if (new Date(trade.openDate.getTime() + trade.limitOrderDuration * 1000) < now) {
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

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async test() {
    // const pairPrice = this.socketPriceService.pairPrice;
    // console.log(">>>>>", pairPrice);
  }

  @Cron(CronExpression.EVERY_SECOND)
  private async processTradeMarket() {
    if (this.isProcessingTradeMarket) {
      console.log("[TradeMarket] Waiting for last job to finish...");
      return;
    }
    this.isProcessingTradeMarket = true;
    const pairPrice = this.socketPriceService.pairPrice;
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
        const trades = this.queuesMarket.splice(0, 10).map((item: any) => {
          const prices = item.pair ? pairPrice[FEED_IDS[item.pair.replace("-", "").toUpperCase()].replace("0x", "")] : 0;
          const entryPrice = prices[2].price;
          return {
            ...item._doc,
            price: entryPrice,
          };
        });

        // Call smartcontract
        return this.openTradeContract(trades);
      }
    } catch (e) {
      console.error(e);
    }

    this.isProcessingTradeMarket = false;
  }

  private async openTradeContract(trades: any[]) {
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

      const openTxn: any[] = [];
      for (const trade of trades) {
        openTxn.push({
          tradeParams: {
            queueId: trade.queueId,
            totalFee: trade.tradeSize,
            period: trade.period,
            targetContract: trade.targetContract,
            strike: trade.strike,
            slippage: trade.slippage,
            allowPartialFill: trade.allowPartialFill || false,
            referralCode: trade.referralCode,
            isAbove: trade.isAbove,
            price: trade.price,
            settlementFee: trade.settlementFee,
            isLimitOrder: trade.isLimitOrder,
            limitOrderExpiry: 0,
            userSignedSettlementFee: 500,
            settlementFeeSignInfo: trade.settlementFeeSignature,
            userSignInfo: trade.userPartialSignature,
            publisherSignInfo: trade.userFullSignature,
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
            r: "0x",
            s: "0x",
            shouldApprove: false,
          },
          user: trade.userAddress,
        });
      }

      // gas estimate
      await contract.estimateGas.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      // write contract
      await contract.openTrades(openTxn, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
    } catch (e) {
      this.logsService.createLog("openTradeContract", e.message);
    } finally {
      delete this.stateOperators[operater];
    }
  }

  private chooseOperator() {
    let operaterMinTime = "";
    let minTime = 9000000000000;
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
    return operaterMinTime;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncBalanceOperator() {
    try {
      // const operaters = await this.getBalanceOperator();
    } catch (e) {
      console.log(e);
    }
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
}
