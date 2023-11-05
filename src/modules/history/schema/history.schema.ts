import { Options, validateAddress } from "common/config/mongoose.config";
import { Network } from "common/enums/network.enum";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { isNil } from "lodash";

export const HISTRIES_MODEL = "histories";
export const HISTRIES_BLOCK_MODEL = "histories_block";


@Schema(Options)
export class Histories  {
  @Prop({ required: true, index: true, trim: true, lowercase: true })
  transaction_hash: string;

  @Prop({ required: true, index: true })
  log_index: number;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    default: function () {
      const { transaction_hash, log_index } = this;
      if (transaction_hash && !isNil(log_index)) {
        return `${transaction_hash}_${log_index}}`;
      }
    },
  })
  transaction_hash_index?: string;

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

  @Prop({ required: false, trim: true, lowercase: true, validate: validateAddress })
  contract_address: string;

  @Prop({ required: true, index: true, enum: Network })
  network: Network;

}

export type HistoriesBlockDocument = HistoriesBlock & Document;
export const HistoriesBlockSchema = SchemaFactory.createForClass(HistoriesBlock);