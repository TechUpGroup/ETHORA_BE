import { Module } from "@nestjs/common";

import { SyncEventModule } from "./sync-event/sync-event.module";

@Module({
  imports: [SyncEventModule],
})
export class JobModule {}
