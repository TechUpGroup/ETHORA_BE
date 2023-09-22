import { Options, validateAddress } from "common/config/mongoose.config";
import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TRADE_STATE, TRADE_TOKEN } from "common/enums/trades.enum";
import { Network } from "common/enums/network.enum";

export const TRADES_MODEL = "trades";

@Schema(Options)
export class Trades {
  @Prop()
  signatureDate: Date;

  @Prop()
  queuedDate: Date;

  @Prop()
  queueId: number;

  @Prop()
  strike: number;

  @Prop()
  period: number;

  @Prop()
  targetContract: string;

  @Prop()
  userPartialSignature: string;

  @Prop()
  userFullSignature: string;

  @Prop({
    required: true,
    index: true,
    trim: true,
    lowercase: true,
    validate: validateAddress,
  })
  userAddress: string;

  @Prop()
  tradeSize: string;

  @Prop()
  allowPartialFill: boolean;

  @Prop()
  referralCode: string;

  @Prop()
  slippage: number;

  @Prop()
  settlementFee: number;

  @Prop()
  settlementFeeSignExpiration: number;

  @Prop()
  settlementFeeSignature: string;

  @Prop()
  expirationDate: Date;

  @Prop()
  isAbove: boolean;

  @Prop()
  state: TRADE_STATE;

  @Prop()
  optionId: number;

  @Prop()
  isLimitOrder: boolean;

  @Prop()
  limitOrderExpirationDate: Date;

  @Prop({ require: true })
  chain: Network;

  @Prop()
  expiryPrice: number;

  @Prop()
  payout: string;

  @Prop()
  closeDate: Date;

  @Prop()
  limitOrderDuration: number;

  @Prop()
  lockedAmount: string;

  @Prop()
  isCancelled: boolean;

  @Prop()
  cancellationReason: string;

  @Prop()
  cancellationDate: Date;

  @Prop()
  earlyCloseSignature: string;

  @Prop()
  userCloseDate: Date;

  @Prop()
  openDate: Date;

  @Prop()
  token: TRADE_TOKEN;
}

export type TradesDocument = Trades & Document;

export const TradesSchema = SchemaFactory.createForClass(Trades);
