import { Module } from "@nestjs/common";

import { SyncEventModule } from "./sync-event/sync-event.module";
import { JobTradeModule } from "./trades/job-trade.module";
import { SyncBlockModule } from "./sync-block/sync-block.module";

@Module({
  imports: [SyncEventModule, JobTradeModule, SyncBlockModule],
})
export class JobModule {}
