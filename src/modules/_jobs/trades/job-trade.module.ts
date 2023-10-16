import { Module } from "@nestjs/common";
import { ContractsModule } from "modules/contracts/contracts.module";
import { JobTradeService } from "./job-trade.service";
import { MongooseModule } from "@nestjs/mongoose";
import { TRADES_MODEL, TradesSchema } from "modules/trades/schemas/trades.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: TRADES_MODEL, schema: TradesSchema }]), ContractsModule],
  providers: [JobTradeService],
})
export class JobTradeModule {}
