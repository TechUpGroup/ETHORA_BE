import { Module, forwardRef } from "@nestjs/common";
import { ContractsModule } from "modules/contracts/contracts.module";
import { JobSyncRouterService } from "./services/sync-router.service";
import { HelperService } from "./services/_helper.service";
import { HistoryModule } from "modules/history/history.module";
import { TradesModule } from "modules/trades/trades.module";
import { UsersModule } from "modules/users/users.module";

@Module({
  imports: [forwardRef(() => UsersModule), ContractsModule, HistoryModule, TradesModule],
  providers: [HelperService, JobSyncRouterService],
})
export class SyncEventModule {}
