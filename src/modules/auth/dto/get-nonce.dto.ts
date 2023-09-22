import { IsEthereumAddress } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";

import { ApiProperty } from "@nestjs/swagger";

export class GetNonceDto {
  @ApiProperty()
  @Trim()
  @ToLowerCase()
  @IsEthereumAddress()
  address: string;
}
