import { IsDefined, IsEmail, IsString } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";

import { ApiProperty } from "@nestjs/swagger";

export class AdminLoginDto {
  @ApiProperty()
  @Trim()
  @ToLowerCase()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  password: string;
}
