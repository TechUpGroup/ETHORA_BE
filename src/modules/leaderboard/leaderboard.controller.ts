import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardRequest } from "./dto/leaderboard.dto";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";

@ApiTags("Leaderboard")
@Controller("leaderboard")
@UseInterceptors(CacheInterceptor)
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get("daily")
  @CacheTTL(60 * 60 * 1000)
  @ApiOperation({ summary: `Get daily leaderboard` })
  createTrade(@Query() query: LeaderboardRequest) {
    return this.service.getDaily(query.chain);
  }

  @Get("weekly")
  @CacheTTL(60 * 60 * 1000)
  @ApiOperation({ summary: `Get weekly leaderboard` })
  updateTrade(@Query() query: LeaderboardRequest) {
    return this.service.getWeekly(query.chain);
  }
}
