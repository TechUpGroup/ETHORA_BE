import { Options } from "common/config/mongoose.config";
import { Network } from "common/enums/network.enum";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const HISTRIES_MODEL = "histories";
export const HISTRIES_BLOCK_MODEL = "histories_block";


@Schema(Options)
export class Histories  {

  @Prop({ required: true, index: true, trim: true, unique: true })
  txHash: string;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;
}

export type HistoriesDocument = Histories & Document;
export const HistoriesSchema = SchemaFactory.createForClass(Histories);

@Schema(Options)
export class HistoriesBlock  {
  @Prop({
    required: true,
    unique: true
  })
  tx_hash_log_index: string;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;
}

export type HistoriesBlockDocument = HistoriesBlock & Document;
export const HistoriesBlockSchema = SchemaFactory.createForClass(HistoriesBlock);