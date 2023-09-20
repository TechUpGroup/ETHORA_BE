import { IsEthereumAddress, IsOptional } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";

import { ApiProperty } from "@nestjs/swagger";

export class GetUsersDto extends PaginationDtoAndSortDto {
  @ApiProperty()
  @IsOptional()
  @ToLowerCase()
  @Trim()
  @IsEthereumAddress()
  address?: string;
}
