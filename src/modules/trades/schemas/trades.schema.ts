import { Options, validateAddress } from "common/config/mongoose.config";
import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TRADE_STATE, TRADE_STATUS, TRADE_TOKEN } from "common/enums/trades.enum";
import { Exclude } from "class-transformer";
import { Network } from "common/enums/network.enum";
import { isNil } from "lodash";

export const TRADES_MODEL = "trades";

@Schema(Options)
export class Trades {
  @Prop()
  @Exclude()
  signatureDate: Date;

  @Prop()
  queuedDate: Date;

  @Prop()
  queueId: number;

  @Prop({ required: true })
  strike: number;

  @Prop({
    required: false,
    default: function () {
      const { strike } = this;
      if (isNil(strike)) {
        return strike;
      }
    },
  })
  strikeOld?: number;

  @Prop({ required: true })
  strikeDate: Date;

  @Prop({ required: true })
  period: number;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  targetContract: string;

  @Prop({ required: true })
  pair: string;

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
  @Exclude()
  settlementFeeSignExpiration: number;

  @Prop()
  @Exclude()
  settlementFeeSignature: string;

  @Prop({ type: String, required: false, default: null })
  expirationDate: string | null;

  @Prop()
  isAbove: boolean;

  @Prop({ required: true, default: TRADE_STATE.QUEUED, index: true })
  state: TRADE_STATE;

  @Prop({ required: false, default: 0 })
  profit?: number;

  @Prop({
    required: false,
    default: function () {
      const { tradeSize } = this;
      if (tradeSize) {
        return -Number(tradeSize);
      }
    },
  })
  pnl?: number;

  @Prop({
    required: false,
    enum: TRADE_STATUS,
    default: TRADE_STATUS.LOSS,
  })
  status?: TRADE_STATUS;

  @Prop({ type: Number, required: false, default: null })
  optionId: number | null;

  @Prop({
    type: String,
    required: false,
    index: true,
  })
  contractOption?: string;

  @Prop({ index: true })
  isLimitOrder: boolean;

  @Prop({
    required: false,
    default: function () {
      const { isLimitOrder } = this;
      return isLimitOrder;
    },
  })
  isLimitOrderOld?: boolean;

  @Prop()
  limitOrderExpirationDate: Date;

  @Prop({ require: true })
  network: Network;

  @Prop({ type: String, required: false, default: null })
  expiryPrice: string | null;

  @Prop({ type: String, required: false, default: null })
  payout: string | null;

  @Prop({ type: Date, required: false, default: null })
  closeDate: Date | null;

  @Prop()
  limitOrderDuration: number;

  @Prop({ type: String, required: false, default: null })
  lockedAmount: string | null;

  @Prop()
  isCancelled: boolean;

  @Prop({ type: String, required: false, default: null })
  cancellationReason: string | null;

  @Prop({ type: String, required: false, default: null })
  @Exclude()
  errorLogs?: string | null;

  @Prop({ type: Date, required: false, default: null })
  cancellationDate: Date | null;

  @Prop({ type: String, required: false, default: null })
  earlyCloseSignature: string | null;

  @Prop({ type: Date, required: false, default: null })
  userCloseDate: Date | null;

  @Prop()
  openDate: Date;

  @Prop()
  token: TRADE_TOKEN;

  @Prop()
  router: string;

  @Prop({ type: String, required: false, default: null })
  pendingOperation?: string | null;

  @Prop({ type: String, required: false, default: null })
  closingTime?: string | null;

  @Prop({ required: false, trim: true, lowercase: true })
  tx_open?: string;

  @Prop({ required: false, trim: true, lowercase: true })
  tx_close?: string;

  @Prop({ required: false, default: 0 })
  call_open?: number;

  @Prop({ required: false, default: 0 })
  call_close?: number;
}

export type TradesDocument = Trades & Document;

export const TradesSchema = SchemaFactory.createForClass(Trades);
