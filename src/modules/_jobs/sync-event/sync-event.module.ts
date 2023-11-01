import { Module } from "@nestjs/common";
import { ContractsModule } from "modules/contracts/contracts.module";
import { JobSyncRouterService } from "./services/sync-router.service";
import { HelperService } from "./services/_helper.service";
import { HistoryModule } from "modules/history/history.module";
import { TradesModule } from "modules/trades/trades.module";
import { JobTradeModule } from "../trades/job-trade.module";

@Module({
  imports: [
    ContractsModule,
    HistoryModule,
    TradesModule,
    JobTradeModule
  ],
  providers: [HelperService, JobSyncRouterService],
})
export class SyncEventModule {}
