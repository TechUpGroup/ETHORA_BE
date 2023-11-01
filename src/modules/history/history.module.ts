import { Module } from "@nestjs/common";
import { HistoryService } from "./history.service";
import { MongooseModule } from "@nestjs/mongoose";
import { HISTRIES_MODEL, HistoriesSchema } from "./schema/history.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HISTRIES_MODEL, schema: HistoriesSchema }]),
    ],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
