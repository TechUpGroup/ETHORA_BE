import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class PermissionDto {
  action: Array<string>;
}

export class CommonIdParams {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class ResHashPasswordDto {
  @ApiProperty()
  @IsString()
  salt: string;

  @ApiProperty()
  @IsString()
  hashPassword: string;
}
