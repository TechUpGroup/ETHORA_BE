import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { TRADES_MODEL, TradesSchema } from "./schemas/trades.schema";
import { TradesController } from "./trades.controller";
import { TradesService } from "./trades.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: TRADES_MODEL, schema: TradesSchema }])],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
