import { IsDate, IsEthereumAddress, IsMongoId, IsOptional } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { TRADE_STATE, TRADE_TOKEN } from "common/enums/trades.enum";
import { NetworkAndPaginationAndSortDto, NetworkDto } from "common/dto/network.dto";

export class GetTradesUserActiveDto extends NetworkAndPaginationAndSortDto {
  @ApiProperty()
  @ToLowerCase()
  @IsOptional()
  @Trim()
  @IsEthereumAddress()
  userAddress?: string;
}

export class CreateTradeDto extends NetworkDto {
  @ApiProperty()
  time: Date;

  @ApiProperty()
  signatureDate: Date;

  @ApiProperty()
  queuedDate: Date;

  @ApiProperty()
  queueId: number;

  @ApiProperty()
  strike: number;
  @ApiProperty()
  period: number;
  @ApiProperty()
  targetContract: string;

  @ApiProperty()
  userPartialSignature: string;

  @ApiProperty()
  userFullSignature: string;

  @ApiProperty()
  userAddress: string;

  @ApiProperty()
  tradeSize: string;

  @ApiProperty()
  allowPartialFill: boolean;

  @ApiProperty()
  referralCode: string;

  @ApiProperty()
  traderNftId: number;

  @ApiProperty()
  slippage: number;

  @ApiProperty()
  settlementFee: number;

  @ApiProperty()
  settlementFeeSignExpiration: number;

  @ApiProperty()
  settlementFeeSignature: string;

  @ApiProperty()
  expirationDate: Date | null;

  @ApiProperty()
  isAbove: boolean;

  @ApiProperty()
  state: TRADE_STATE;

  @ApiProperty()
  optionId: number | null;

  @ApiProperty()
  isLimitOrder: boolean;

  @ApiProperty()
  limitOrderExpirationDate: Date;

  @ApiProperty()
  expiryPrice: number | null;

  @ApiProperty()
  payout: string | null;

  @ApiProperty()
  closeDate: Date | null;

  @ApiProperty()
  limitOrderDuration: number;

  @ApiProperty()
  lockedAmount: string | null;

  @ApiProperty()
  isCancelled: boolean;

  @ApiProperty()
  cancellationReason: string | null;

  @ApiProperty()
  cancellationDate: Date | null;

  @ApiProperty()
  earlyCloseSignature: string | null;

  @ApiProperty()
  userCloseDate: Date | null;

  @ApiProperty()
  openDate: Date;

  @ApiProperty()
  token: TRADE_TOKEN;

  @ApiProperty()
  pendingOperation?: string | null;

  // signature_timestamp=1696344585
  // strike=2732722631537
  // period=900
  // target_contract=0xE7774cD710524b711756fAf340cb5567BFFba048
  // partial_signature=0x67a9afd6a7fbde261b91c8b41d72a7df8e0f46c8a30e1df66bee689577e020c219ef01a4e1b4d06a83a90c71ac72a0b585c5a252a418d618106fc8f4173cf5351b
  // full_signature=0x20d7ae8a731050e75fe39afc536cd068277b58ca218cb5b76dd97401696bf08338bc532fbb710150859d56ceb7e7a69bae53b7c81ba413c4c333760f8ed57ccf1b
  // user_address=0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3
  // trade_size=5000000
  // allow_partial_fill=true
  // referral_code=
  // trader_nft_id=0
  // slippage=3
  // is_above=true
  // is_limit_order=false
  // limit_order_duration=0
  // settlement_fee=500
  // settlement_fee_sign_expiration=1696344638
  // settlement_fee_signature=0x1caa06b0221b2bdb4a5b27b96c5853f7df5f173308ab01c188848db9f7c50d13039c5ebd34f6c9a6bd180bca1967aa8178a03fbbfc2b43af5a6246c4c69462ee1c
  // environment=421613
  // token=USDC
}

export class UpdateTradeDto extends NetworkDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;
}

export class CancelTradeDto extends NetworkDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;
}

export class CloseTradeDto extends NetworkDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @ApiProperty()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  @IsDate()
  closeDate: Date;
}
