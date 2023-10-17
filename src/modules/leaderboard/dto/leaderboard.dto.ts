import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional } from "class-validator";
import { IsOffsetInRange } from "common/decorators/leaderboard.decorator";
import { NetworkDto } from "common/dto/network.dto";
import { LeaderboardType } from "common/enums/leaderboard.enums";
import { UserStatsGql } from "modules/users/dto/stats.dto";

export class LeaderboardRequest extends NetworkDto {
  @ApiProperty()
  type: LeaderboardType;

  @ApiProperty({ required: false })
  @Transform(({ value }) => Number(value))
  @IsOffsetInRange()
  @IsOptional()
  offset: number;
}

export class SummaryGqlDto {
  totalData: {
    totalTrades: number;
    volume: string;
  }[];
  reward: { settlementFee: string; totalFee: string }[];
  userData: UserStatsGql[];
}

export class LeaderboardGqlDto extends SummaryGqlDto {
  userStats: UserStatsGql[];
  winnerWinrate: UserStatsGql[];
  loserStats: UserStatsGql[];
}

export class LeaderboardSummaryDto {
  totalTrades: number;
  totalUserTrades: number;
  timeLeftByMs: number;
  endDate: Date;
  totalRewardPool: string;
  totalVolume: string;
}

export class LeaderboardUserDto {}

export class LeaderboardSummaryResponse {
  summary: LeaderboardSummaryDto;
  user: LeaderboardUserDto;
}

export class LeaderboardResponse extends LeaderboardSummaryResponse {
  winners: UserStatsGql[];
  winnersWinrate: UserStatsGql[];
  losers: UserStatsGql[];
}
