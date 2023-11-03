
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BlocksService } from "./blocks.service";
import { BLOCKS_MODEL, BlocksSchema } from "./schemas/blocks.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: BLOCKS_MODEL, schema: BlocksSchema }])],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
