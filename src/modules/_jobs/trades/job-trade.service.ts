import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class JobTradeService {
  constructor() {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {}
}
