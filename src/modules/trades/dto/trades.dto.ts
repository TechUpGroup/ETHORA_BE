import { IsDate, IsEnum, IsEthereumAddress, IsMongoId, IsOptional } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

import { ApiProperty } from "@nestjs/swagger";
import { NetworkId } from "common/enums/network.enum";
import { Transform, Type } from "class-transformer";

export class BaseTradesRequest {
  @ApiProperty()
  @ToLowerCase()
  @Trim()
  @IsEnum(NetworkId)
  @Transform(({ value }) => Number(value))
  chain: NetworkId;
}

export class GetTradesUserActiveDto extends PaginationDtoAndSortDto {
  @ApiProperty()
  @ToLowerCase()
  @IsOptional()
  @Trim()
  @IsEthereumAddress()
  userAddress?: string;

  @ApiProperty()
  @ToLowerCase()
  @Trim()
  @Transform(({ value }) => Number(value))
  @IsEnum(NetworkId)
  chain: NetworkId;
}

export class CreateTradeDto extends BaseTradesRequest {
  @ApiProperty()
  @ToLowerCase()
  @Trim()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  @IsDate()
  time: Date;
}

export class UpdateTradeDto extends BaseTradesRequest {
  @ApiProperty()
  @IsMongoId()
  _id: string;
}

export class CancelTradeDto extends BaseTradesRequest {
  @ApiProperty()
  @IsMongoId()
  _id: string;
}

export class CloseTradeDto extends BaseTradesRequest {
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @ApiProperty()
  @Type(() => Date)
  @Transform(({ value }) => new Date(value))
  @IsDate()
  closeDate: Date;
}
