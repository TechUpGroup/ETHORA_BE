import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { LogsService } from "./logs.service";
import { LOGS_MODEL, LogsSchema } from "./schemas/logs.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: LOGS_MODEL, schema: LogsSchema }])],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
