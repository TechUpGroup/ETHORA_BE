import { Options } from "common/config/mongoose.config";
import { Network } from "common/enums/network.enum";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const BLOCKS_MODEL = "blocks";

@Schema(Options)
export class Blocks {
  @Prop({ required: true, default: 0 })
  blocknumber_synced: number;

  @Prop({ required: true, unique: true, enum: Network })
  network: Network;
}

export type BlocksDocument = Blocks & Document;
export const BlocksSchema = SchemaFactory.createForClass(Blocks);
