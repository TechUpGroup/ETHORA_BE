import { IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class LogOutDto extends RefreshTokenDto {}
