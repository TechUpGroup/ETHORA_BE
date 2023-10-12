import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { DashboardService } from "./dashboard.service";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { NetworkDto } from "common/dto/network.dto";

@ApiTags("Dashboard")
@Controller("dashboard")
@UseInterceptors(CacheInterceptor)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("overview")
  @CacheTTL(60 * 60 * 1000)
  @ApiOperation({ summary: `Get overview of dashboard` })
  getOverview(@Query() query: NetworkDto) {
    return this.service.getOverview(query.network);
  }

  @Get("markets")
  @CacheTTL(60 * 60 * 1000)
  @ApiOperation({ summary: `Get token of dashboard` })
  getTokens(@Query() query: NetworkDto) {
    return this.service.getMarkets(query.network);
  }
}
