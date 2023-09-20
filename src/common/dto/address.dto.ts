import { IsDefined, IsEthereumAddress } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { NetworkDto } from "common/dto/network.dto";

import { ApiProperty } from "@nestjs/swagger";

export class NetworkWithAddressDto extends NetworkDto {
  @ApiProperty()
  @IsDefined()
  @Trim()
  @ToLowerCase()
  @IsEthereumAddress()
  address: string;
}

export class AddressDto {
  @ApiProperty()
  @IsDefined()
  @Trim()
  @ToLowerCase()
  @IsEthereumAddress()
  address: string;
}
