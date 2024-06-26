import { Module } from "@nestjs/common";
import { JobSyncBlockService } from "./services/sync-block.sevice";
import { BlocksModule } from "modules/blocks/blocks.module";
import { HistoryModule } from "modules/history/history.module";
import { HelperService } from "./services/_helper.service";
import { TradesModule } from "modules/trades/trades.module";
import { ContractsModule } from "modules/contracts/contracts.module";

@Module({
  imports: [BlocksModule, TradesModule, HistoryModule, ContractsModule],
  providers: [JobSyncBlockService, HelperService],
})
export class SyncBlockModule {}
