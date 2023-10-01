import { User } from "common/decorators/user.decorator";

import { Controller, Get, Post, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import { Auth } from "common/decorators/http.decorators";
import { CacheInterceptor } from "@nestjs/cache-manager";

@ApiTags("Users")
@Controller("users")
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

  @Get("metrics")
  @Auth()
  @UseInterceptors(CacheInterceptor)
  getMetrics(@User() user: UsersDocument) {
    return this.service.getMetrics(user.address);
  }
}
