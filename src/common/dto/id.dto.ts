import { IsMongoId, IsNotEmpty } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";

import { ApiProperty } from "@nestjs/swagger";

export class MongoIdDto {
  @ApiProperty()
  @IsMongoId()
  id: string;
}

export class SlugDto {
  @ApiProperty()
  @IsNotEmpty()
  @Trim()
  @ToLowerCase()
  slug: string;
}
