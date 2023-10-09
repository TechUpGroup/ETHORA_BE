import { Options, validateAddress } from "common/config/mongoose.config";
import { Network } from "common/enums/network.enum";
import { Document, SchemaTypes, Types } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const ETH_PAIR_MODEL = "eth_pair";

@Schema(Options)
export class EthPair {

  @Prop({ required: true, index: true, enum: Network })
  network: Network;

  @Prop({ required: true, index: true, trim: true, lowercase: true, validate: validateAddress, unique: true })
  pair: string;

  @Prop({ required: true, index: true, trim: true, lowercase: true, validate: validateAddress })
  owner_token_launched?: string;

  @Prop({ required: true, index: true, trim: true, lowercase: true, validate: validateAddress })
  token_launched: string;

  @Prop({ required: false })
  name_launched?: string;

  @Prop({ required: false })
  symbol_launched?: string;

  @Prop({ required: false, default: 18 })
  decimal_launched: number;

  @Prop({ required: false, type: SchemaTypes.Decimal128, index: true, min: 0 })
  reserver_launched: Types.Decimal128;

  @Prop({ required: false })
  token_launched_index: number;

  @Prop({ required: true, index: true, trim: true, lowercase: true, validate: validateAddress })
  token: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  symbol?: string;

  @Prop({ required: false, default: 18 })
  decimal: number;

  @Prop({ required: false, type: SchemaTypes.Decimal128, index: true, min: 0 })
  reserver: Types.Decimal128;

  @Prop({ required: false, type: SchemaTypes.Decimal128, index: true, min: 0 })
  total_supply: Types.Decimal128;

  @Prop({ required: true, index: true })
  version: number;

  @Prop({ required: false, index: true })
  init_lq: number;

  @Prop({ required: false, index: true })
  listing_price: number;

  @Prop({ required: false, index: true })
  supply_added_lq: number;

  @Prop({ required: false, index: true })
  fdv: number;

  @Prop({ required: false, index: true, default: 0 })
  total_volume: number;

  @Prop({ required: false, index: true, default: 0 })
  trading_time: number;
}

export type EthPairDocument = EthPair & Document;
export const EthPairSchema = SchemaFactory.createForClass(EthPair);
