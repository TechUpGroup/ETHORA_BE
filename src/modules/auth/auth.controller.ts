import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { GetNonceDto } from "./dto/get-nonce.dto";
import { ApproveDto, LoginDto, RegisterDto } from "./dto/login.dto";
import { LogOutDto, RefreshTokenDto } from "./dto/refresh-token.dto";
import { Auth } from "common/decorators/http.decorators";
import { User } from "common/decorators/user.decorator";
import { UsersDocument } from "../users/schemas/users.schema";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("get-nonce/:address")
  @ApiOperation({ summary: `Get nonce of user using wallet address` })
  async getNonce(@Param() { address }: GetNonceDto) {
    return this.authService.getNonce(address);
  }

  @Post("login")
  @ApiOperation({ summary: "Login by address and signature" })
  async logIn(@Body() logInDto: LoginDto) {
    return this.authService.logIn(logInDto);
  }

  @Post("register")
  @Auth()
  @ApiOperation({ summary: "Register/Deregister trade account by signature" })
  async register(@User() user: UsersDocument, @Body() dto: RegisterDto) {
    return this.authService.register(user._id, dto);
  }

  @Post("approve")
  @Auth()
  @ApiOperation({ summary: "Approve trade token by signature" })
  async approve(@User() user: UsersDocument, @Body() dto: ApproveDto) {
    return this.authService.approve(user._id, dto);
  }

  @Post("logout")
  @ApiOperation({ summary: "Logout and remove refresh token" })
  async logOut(@Body() logOutDto: LogOutDto) {
    return this.authService.logOut(logOutDto.refreshToken);
  }

  @Post("refresh-tokens")
  @ApiOperation({ summary: "Get a new access and refresh token" })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get("check-code")
  async checkCode() {
    return { message: "success" };
  }
}
