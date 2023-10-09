
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BlocksController } from "./blocks.controller";
import { BlocksService } from "./blocks.service";
import { BLOCKS_MODEL, BlocksSchema } from "./schemas/blocks.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: BLOCKS_MODEL, schema: BlocksSchema }])],
  controllers: [BlocksController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
