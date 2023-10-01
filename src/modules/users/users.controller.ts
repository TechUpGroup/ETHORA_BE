import { User } from "common/decorators/user.decorator";

import { Controller, Get, Post, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import { Auth } from "common/decorators/http.decorators";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { UserStatsRequest } from "./dto/stats.dto";

@ApiTags("Users")
@Controller("users")
@UseInterceptors(CacheInterceptor)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get("me")
  @Auth()
  getMe(@User() user: UsersDocument) {
    return user;
  }

  @Post("faucet")
  @Auth()
  postFaucet(@User() user: UsersDocument) {
    return this.service.postFaucet(user.address);
  }

  @Get("stats")
  @Auth()
  @CacheTTL(60 * 1000)
  getStats(@User() user: UsersDocument, @Query() query: UserStatsRequest) {
    return this.service.getStats(user.address, query.chain);
  }
}
