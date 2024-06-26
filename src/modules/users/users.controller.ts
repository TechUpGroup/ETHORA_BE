import { User } from "common/decorators/user.decorator";

import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import { Auth, AuthOptional } from "common/decorators/http.decorators";
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
    user.mnemonic = undefined as any;
    return user;
  }

  // @Post("faucet")
  // @Auth()
  // postFaucet(@User() user: UsersDocument) {
  //   return this.service.postFaucet(user.address);
  // }

  @Get("stats")
  @AuthOptional()
  @CacheTTL(10 * 1000)
  @ApiOperation({ summary: `Get stats of user in profile` })
  getStats(@User() user: UsersDocument, @Query() query: UserStatsRequest) {
    return this.service.getStats(query?.userAddress || user?.address || "", query.network);
  }
}
