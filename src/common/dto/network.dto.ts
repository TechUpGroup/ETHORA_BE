import { IsDefined, IsEnum, IsOptional } from "class-validator";
import { NetworkAvailable } from "common/constants/network";
import { Network } from "common/enums/network.enum";

import { ApiProperty } from "@nestjs/swagger";

import { PaginationDto, PaginationDtoAndSortDto } from "./pagination.dto";

export class NetworkDto {
  @ApiProperty({
    enum: NetworkAvailable,
    description: Object.values(NetworkAvailable).join(","),
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  readonly network: Network;
}

export class NetworkOptionalDto {
  @ApiProperty({
    enum: NetworkAvailable,
    required: false,
    description: Object.values(NetworkAvailable).join(","),
  })
  @IsOptional()
  @IsEnum(NetworkAvailable)
  readonly network?: Network;
}

export class NetworkAndPaginationDto extends PaginationDto {
  @ApiProperty({
    enum: NetworkAvailable,
    description: Object.values(NetworkAvailable).join(","),
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  readonly network: Network;
}

export class NetworkAndPaginationAndSortDto<T = string> extends PaginationDtoAndSortDto<T> {
  @ApiProperty({
    enum: NetworkAvailable,
    description: Object.values(NetworkAvailable).join(","),
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  readonly network: Network;
}
