import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { TRADES_MODEL, TradesSchema } from "./schemas/trades.schema";
import { TradesController } from "./trades.controller";
import { TradesService } from "./trades.service";
import { UsersModule } from "modules/users/users.module";
import { JobTradeService } from "modules/_jobs/trades/job-trade.service";

@Module({
  imports: [forwardRef(() => UsersModule), MongooseModule.forFeature([{ name: TRADES_MODEL, schema: TradesSchema }])],
  controllers: [TradesController],
  providers: [TradesService, JobTradeService],
  exports: [TradesService, JobTradeService],
})
export class TradesModule {}
