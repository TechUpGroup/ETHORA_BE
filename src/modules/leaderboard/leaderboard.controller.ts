import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardPointsRequest, LeaderboardRequest } from "./dto/leaderboard.dto";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "modules/users/schemas/users.schema";
import { AuthOptional } from "common/decorators/http.decorators";
import { AuthCacheInterceptor } from "common/interceptors/auth-cache.interceptor";
import { CacheTTL } from "@nestjs/cache-manager";
import { NetworkDto } from "common/dto/network.dto";

@ApiTags("Leaderboard")
@Controller("leaderboard")
@UseInterceptors(AuthCacheInterceptor)
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get("offsets")
  @CacheTTL(60 * 1000)
  @ApiOperation({ summary: `Get current offset of leaderboard` })
  getOffsets(@Query() query: NetworkDto) {
    return this.service.getOffsets(query.network);
  }

  @Get()
  @AuthOptional()
  @CacheTTL(60 * 1000)
  @ApiOperation({ summary: `Get data leaderboard` })
  getDaily(@User() user: UsersDocument, @Query() query: LeaderboardRequest) {
    return this.service.getLeaderboard(user?.address || "", query);
  }

  @Get("points")
  @CacheTTL(60 * 1000)
  @ApiOperation({ summary: `Get data leaderboard points` })
  getLeaderboardPoints(@Query() query: LeaderboardPointsRequest) {
    return this.service.getLeaderboardPoints(query);
  }
}
