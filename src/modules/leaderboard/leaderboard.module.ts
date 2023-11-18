import { Module } from "@nestjs/common";

import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";
import { MongooseModule } from "@nestjs/mongoose";
import { LEADERBOARD_CONFIG_MODEL, LeaderboardConfigSchema } from "./schemas/leaderboard.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: LEADERBOARD_CONFIG_MODEL, schema: LeaderboardConfigSchema }])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
