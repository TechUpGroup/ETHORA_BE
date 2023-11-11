import { Global, Module, forwardRef } from "@nestjs/common";
import { ContractsModule } from "modules/contracts/contracts.module";
import { JobTradeService } from "./job-trade.service";
import { MongooseModule } from "@nestjs/mongoose";
import { TRADES_MODEL, TradesSchema } from "modules/trades/schemas/trades.schema";
import { TradesModule } from "modules/trades/trades.module";

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: TRADES_MODEL, schema: TradesSchema }]), ContractsModule, forwardRef(() => TradesModule)],
  providers: [JobTradeService],
  exports: [JobTradeService],
})
export class JobTradeModule {}
