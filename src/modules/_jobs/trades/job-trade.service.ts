import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PairContractName } from "common/constants/contract";
import { FEED_IDS } from "common/constants/price";
import { TRADE_STATE } from "common/enums/trades.enum";
import { SocketPriceService } from "modules/_shared/services/socket-price.service";
import { TRADES_MODEL, TradesDocument } from "modules/trades/schemas/trades.schema";
import { PaginateModel } from "mongoose";

@Injectable()
export class JobTradeService {
  public queuesMarket: TradesDocument[] = [];
  public queuesLimitOrder: TradesDocument[] = [];
  private isProcessingTradeMarket = false;

  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly tradesModel: PaginateModel<TradesDocument>,
    private readonly socketPriceService: SocketPriceService,
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
      console.log('[TradeMarket] Loaded', trades.length, 'tradesMarket to queues')
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
      }
    } catch (e) {
      console.error(e);
    }

    this.isProcessingTradeMarket = false;
  }
}
