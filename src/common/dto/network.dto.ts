import { IsDefined, IsEnum, IsOptional } from "class-validator";
import { NetworkAvailable } from "common/constants/network";
import { Network } from "common/enums/network.enum";

import { ApiProperty } from "@nestjs/swagger";

import { PaginationDto, PaginationDtoAndSortDto } from "./pagination.dto";
import { Transform } from "class-transformer";

export class NetworkDto {
  @ApiProperty({
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  @Transform(({ value }) => Number(value))
  readonly network: Network;
}

export class NetworkOptionalDto {
  @ApiProperty({
    required: false,
    default: Network.goerli,
  })
  @IsOptional()
  @IsEnum(NetworkAvailable)
  @Transform(({ value }) => Number(value))
  readonly network?: Network;
}

export class NetworkAndPaginationDto extends PaginationDto {
  @ApiProperty({
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  @Transform(({ value }) => Number(value))
  readonly network: Network;
}

export class NetworkAndPaginationAndSortDto<T = string> extends PaginationDtoAndSortDto<T> {
  @ApiProperty({
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  @Transform(({ value }) => Number(value))
  readonly network: Network;
}
