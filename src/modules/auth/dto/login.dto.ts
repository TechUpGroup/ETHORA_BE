import { IsBoolean, IsEthereumAddress, IsNumber, IsOptional, IsString } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";

import { ApiProperty } from "@nestjs/swagger";
import { NetworkDto } from "common/dto/network.dto";

export class LoginDto extends NetworkDto {
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

export class RegisterDto extends NetworkDto {
  @ApiProperty()
  @IsString()
  signature: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isRegister: boolean;
}

export class Permit {
  @ApiProperty()
  @IsNumber()
  deadline: number;

  @ApiProperty()
  @IsNumber()
  v: number;

  @ApiProperty()
  @IsString()
  r: string;

  @ApiProperty()
  @IsString()
  s: string;
}

export class ApproveDto extends NetworkDto {
  @ApiProperty()
  permit: Permit;

  @ApiProperty({ default: true })
  @IsBoolean()
  isApprove: boolean;
}
