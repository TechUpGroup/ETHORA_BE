import { Module } from "@nestjs/common";

import { SyncEventModule } from "./sync-event/sync-event.module";
import { JobTradeModule } from "./trades/job-trade.module";

@Module({
  imports: [SyncEventModule, JobTradeModule],
})
export class JobModule {}
