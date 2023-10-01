import { Options, validateAddress } from "common/config/mongoose.config";
import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TRADE_STATE, TRADE_TOKEN } from "common/enums/trades.enum";
import { ChainId } from "common/enums/network.enum";
import { Exclude } from "class-transformer";

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
  @Exclude()
  userPartialSignature: string;

  @Prop()
  @Exclude()
  userFullSignature: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    validate: validateAddress,
  })
  @Exclude()
  userAddress: string;

  @Prop()
  tradeSize: string;

  @Prop()
  allowPartialFill: boolean;

  @Prop()
  referralCode: string;

  @Prop()
  @Exclude()
  traderNftId: number;

  @Prop()
  slippage: number;

  @Prop()
  settlementFee: number;

  @Prop()
  @Exclude()
  settlementFeeSignExpiration: number;

  @Prop()
  @Exclude()
  settlementFeeSignature: string;

  @Prop({ type: Date, required: false })
  expirationDate: Date | null;

  @Prop()
  isAbove: boolean;

  @Prop()
  state: TRADE_STATE;

  @Prop({ type: Number, required: false })
  optionId: number | null;

  @Prop()
  isLimitOrder: boolean;

  @Prop()
  limitOrderExpirationDate: Date;

  @Prop({ require: true })
  chain: ChainId;

  @Prop({ type: Number, required: false })
  expiryPrice: number | null;

  @Prop({ type: String, required: false })
  payout: string | null;

  @Prop({ type: Date, required: false })
  closeDate: Date | null;

  @Prop()
  limitOrderDuration: number;

  @Prop({ type: String, required: false })
  lockedAmount: string | null;

  @Prop()
  isCancelled: boolean;

  @Prop({ type: String, required: false })
  cancellationReason: string | null;

  @Prop({ type: Date, required: false })
  cancellationDate: Date | null;

  @Prop({ type: String, required: false })
  earlyCloseSignature: string | null;

  @Prop({ type: Date, required: false })
  userCloseDate: Date | null;

  @Prop()
  openDate: Date;

  @Prop()
  token: TRADE_TOKEN;

  @Prop()
  router?: string;

  @Prop({ type: String, required: false })
  pendingOperation?: string | null;
}

export type TradesDocument = Trades & Document;

export const TradesSchema = SchemaFactory.createForClass(Trades);
