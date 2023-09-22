import { IsDefined, IsEnum, IsOptional, IsPositive, Max } from "class-validator";
import { ToInt, ToSortType } from "common/decorators/transforms.decorator";
import { SortType, SortTypeNumber } from "common/enums/dto.enum";

import { ApiProperty } from "@nestjs/swagger";

export class PaginationDto {
  @ApiProperty({ default: 1 })
  @IsDefined()
  @ToInt()
  @IsPositive()
  page: number;

  @ApiProperty({ default: 10 })
  @IsDefined()
  @ToInt()
  @IsPositive()
  @Max(100)
  limit: number;
}

export class SortDto<T = string> {
  @IsOptional()
  sortBy?: T;

  @ApiProperty({ enum: SortType, required: false })
  @IsOptional()
  @ToSortType()
  @IsEnum(SortTypeNumber)
  sortType?: SortTypeNumber;
}

export class PaginationDtoAndSortDto<T = string> extends PaginationDto {
  @IsOptional()
  sortBy?: T;

  @ApiProperty({ enum: SortType, required: false })
  @IsOptional()
  @ToSortType()
  @IsEnum(SortTypeNumber)
  sortType?: SortTypeNumber;
}
