import { IsEthereumAddress, IsMongoId, IsNumber, IsOptional, Max, Min } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { ApiProperty } from "@nestjs/swagger";
import { TRADE_TOKEN } from "common/enums/trades.enum";
import { NetworkAndPaginationAndSortDto, NetworkDto } from "common/dto/network.dto";
import { TRADE_DURATION } from "common/constants/trades";

export class GetTradesUserActiveDto extends NetworkAndPaginationAndSortDto {
  @ApiProperty()
  @ToLowerCase()
  @IsOptional()
  @Trim()
  @IsEthereumAddress()
  userAddress?: string;
}

export class CreateTradeDto extends NetworkDto {
  // @ApiProperty()
  // signatureDate: Date;

  @ApiProperty()
  strike: number;

  @ApiProperty({ default: TRADE_DURATION.MIN })
  @IsNumber()
  @Min(TRADE_DURATION.MIN)
  @Max(TRADE_DURATION.MAX)
  period: number;

  @ApiProperty()
  @IsEthereumAddress()
  targetContract: string;

  // @ApiProperty()
  // partialSignature: string;

  // @ApiProperty()
  // fullSignature: string;

  @ApiProperty()
  tradeSize: string;

  // @ApiProperty()
  // allowPartialFill: boolean;

  @ApiProperty()
  slippage: number;

  // @ApiProperty()
  // settlementFee: number;

  // @ApiProperty()
  // settlementFeeSignExpiration: number;

  // @ApiProperty()
  // settlementFeeSignature: string;

  @ApiProperty()
  isAbove: boolean;

  @ApiProperty({ default: false })
  isLimitOrder: boolean;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  @Max(TRADE_DURATION.MAX)
  limitOrderDuration: number;

  @ApiProperty()
  token: TRADE_TOKEN;

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

  @ApiProperty()
  strike: number;

  @ApiProperty({ default: TRADE_DURATION.MIN })
  @IsNumber()
  @Min(TRADE_DURATION.MIN)
  @Max(TRADE_DURATION.MAX)
  period: number;

  @ApiProperty()
  slippage: number;

  @ApiProperty()
  isAbove: boolean;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  @Max(TRADE_DURATION.MAX)
  limitOrderDuration: number;
}

export class CancelTradeDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;
}

export class CloseTradeDto {
  @ApiProperty()
  @IsMongoId()
  _id: string;
}
