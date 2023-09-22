import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { GetNonceDto } from "./dto/get-nonce.dto";
import { LoginDto } from "./dto/login.dto";
import { LogOutDto, RefreshTokenDto } from "./dto/refresh-token.dto";

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
