import config from "common/config";
import { UsersModule } from "modules/users/users.module";

import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TOKENS_MODEL, TokensSchema } from "./schemas/tokens.schema";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TokensService } from "./token.service";
import { CONTRACTS_MODEL, ContractsSchema } from "modules/contracts/schemas/contracts.schema";
import { ContractsService } from "modules/contracts/contracts.service";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([{ name: TOKENS_MODEL, schema: TokensSchema }]),
    MongooseModule.forFeature([{ name: CONTRACTS_MODEL, schema: ContractsSchema }]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: config.jwt.secret,
    }),
  ],

  controllers: [AuthController],
  providers: [JwtStrategy, AuthService, TokensService, ContractsService],
  exports: [JwtModule, AuthService, TokensService],
})
export class AuthModule {}
