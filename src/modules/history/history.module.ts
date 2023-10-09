import { Module } from "@nestjs/common";
import { HistoryService } from "./history.service";
import { MongooseModule } from "@nestjs/mongoose";
import { HISTRIES_BLOCK_MODEL, HISTRIES_MODEL, HistoriesBlockSchema, HistoriesSchema } from "./schema/history.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HISTRIES_MODEL, schema: HistoriesSchema }]),
    MongooseModule.forFeature([{ name: HISTRIES_BLOCK_MODEL, schema: HistoriesBlockSchema }]),
    ],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
