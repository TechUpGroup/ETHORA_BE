import { IsEthereumAddress, IsOptional, IsString } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";

import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty()
  @Trim()
  @ToLowerCase()
  @IsEthereumAddress()
  address: string;

  @ApiProperty()
  @IsString()
  signature: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  message?: string;
}
