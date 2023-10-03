import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardRequest } from "./dto/leaderboard.dto";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { AuthOptional } from "common/decorators/http.decorators";
import { BaseTradesRequest } from "modules/trades/dto/trades.dto";

@ApiTags("Leaderboard")
@Controller("leaderboard")
@UseInterceptors(CacheInterceptor)
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get("offsets")
  @CacheTTL(60 * 60 * 1000)
  @ApiOperation({ summary: `Get current offset of leaderboard` })
  getOffsets(@Query() query: BaseTradesRequest) {
    return this.service.getOffsets(query.chain);
  }

  @Get()
  @AuthOptional()
  @CacheTTL(60 * 60 * 1000)
  @ApiOperation({ summary: `Get data leaderboard` })
  getDaily(@User() user: UsersDocument, @Query() query: LeaderboardRequest) {
    return this.service.getLeaderboard(user?.address || "", query);
  }
}
