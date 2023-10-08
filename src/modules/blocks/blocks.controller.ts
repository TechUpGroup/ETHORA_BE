import { NetworkOptionalDto } from "common/dto/network.dto";

import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { BlocksService } from "./blocks.service";
import { CacheInterceptor } from "@nestjs/cache-manager";

@ApiTags("Blocks")
@Controller("blocks")
@UseInterceptors(CacheInterceptor)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get()
  async getAllBlocksByNetwork(@Query() { network }: NetworkOptionalDto) {
    return this.blocksService.getAll(network);
  }
}
