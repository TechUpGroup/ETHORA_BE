import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TRADES_MODEL, TradesDocument } from "modules/trades/schemas/trades.schema";
import { PaginateModel } from "mongoose";

@Injectable()
export class JobTradeService {
  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly tradesModel: PaginateModel<TradesDocument>,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {}
}
