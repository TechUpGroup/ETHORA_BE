import { User } from "common/decorators/user.decorator";

import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { UsersDocument } from "./schemas/users.schema";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@User() user: UsersDocument) {
    return user;
  }
}
