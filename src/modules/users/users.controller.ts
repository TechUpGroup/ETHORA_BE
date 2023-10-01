import { User } from "common/decorators/user.decorator";

import { Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";
import { Auth } from "common/decorators/http.decorators";

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
}
