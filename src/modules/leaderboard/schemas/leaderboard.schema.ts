import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const LEADERBOARD_CONFIG_MODEL = "leaderboard_configs";

@Schema(Options)
export class LeaderboardConfig {
  @Prop()
  dailyStart: Date;

  @Prop()
  dailyEnd: Date;

  @Prop()
  weeklyStart: Date;

  @Prop()
  weeklyEnd: Date;
}

export type LeaderboardConfigDocument = LeaderboardConfig & Document;

export const LeaderboardConfigSchema = SchemaFactory.createForClass(LeaderboardConfig);
