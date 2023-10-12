import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsTimestamp } from "common/decorators/validators.decorator";
import { NetworkDto } from "common/dto/network.dto";

export class StatsRequest extends NetworkDto {
  @ApiProperty({ default: Math.round(new Date().getTime() / 1000 - 5270400) })
  @Transform(({ value }) => +value)
  @IsTimestamp()
  start: number;

  @ApiProperty({ default: Math.round(new Date().getTime() / 1000) })
  @Transform(({ value }) => +value)
  @IsTimestamp()
  end: number;
}
