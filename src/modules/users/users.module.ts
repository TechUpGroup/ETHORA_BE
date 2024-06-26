import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { USERS_MODEL, UsersSchema, WALLETS_MODEL, WalletsSchema } from "./schemas/users.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { LeaderboardModule } from "modules/leaderboard/leaderboard.module";

@Module({
  imports: [
    forwardRef(() => LeaderboardModule),
    MongooseModule.forFeature([{ name: USERS_MODEL, schema: UsersSchema }]),
    MongooseModule.forFeature([{ name: WALLETS_MODEL, schema: WalletsSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
