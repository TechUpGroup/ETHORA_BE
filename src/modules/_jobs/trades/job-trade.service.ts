import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TRADE_STATE } from "common/enums/trades.enum";
import { TRADES_MODEL, TradesDocument } from "modules/trades/schemas/trades.schema";
import { PaginateModel } from "mongoose";

@Injectable()
export class JobTradeService {
  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly tradesModel: PaginateModel<TradesDocument>,
  ) {}

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
                cancellationReason: "Trade reached overtime",
                cancellationDate: now,
                closeDate: now,
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
}
