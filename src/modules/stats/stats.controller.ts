import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { StatsService } from "./stats.service";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { StatsRequest } from "./dto/stats.dto";

@ApiTags("Stats")
@Controller("stats")
@UseInterceptors(CacheInterceptor)
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get()
  @CacheTTL(60 * 1000)
  @ApiOperation({ summary: `Get data of stats` })
  getOverview(@Query() query: StatsRequest) {
    return this.service.getStats(query);
  }
}
