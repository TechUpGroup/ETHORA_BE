import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDefined, IsEnum, IsOptional } from "class-validator";
import { IsOffsetInRange } from "common/decorators/leaderboard.decorator";
import { NetworkDto } from "common/dto/network.dto";
import { LeaderboardType } from "common/enums/leaderboard.enums";
import { UserStatsGql } from "modules/users/dto/stats.dto";
import { LeaderboardConfigDocument } from "../schemas/leaderboard.schema";
import { PaginationDtoAndSortDto } from "common/dto/pagination.dto";
import { Network } from "common/enums/network.enum";
import { NetworkAvailable } from "common/constants/network";

export class LeaderboardRequest extends NetworkDto {
  @ApiProperty()
  type: LeaderboardType;

  @ApiProperty({ required: false })
  @Transform(({ value }) => Number(value))
  @IsOffsetInRange()
  @IsOptional()
  offset: number;
}

export class LeaderboardPointsRequest extends PaginationDtoAndSortDto {
  @ApiProperty({
    default: Network.goerli,
  })
  @IsDefined()
  @IsEnum(NetworkAvailable)
  @Transform(({ value }) => Number(value))
  readonly network: Network;

  @IsOptional()
  @ApiProperty({ type: String, required: false, default: "point" })
  sortBy?: string;
}

export class TotalDataGql {
  totalTrades: number;
  volume: string;
}

export class RewardGql {
  settlementFee: string;
  totalFee: string;
}

export class SummaryGqlDto {
  totalData: TotalDataGql[];
  reward: RewardGql[];
  userData: UserStatsGql[];
}

export class CountLeaderboardPointsGql {
  id: "count";
  totalCount: number;
}

export class PointsGql {
  id: string;
  point: string;
  totalTrades: number;
  volume: string;
  usdcVolume: string;
  usdcTotalTrades: number;
}

export class LeaderboardPointsGqlDto {
  count: CountLeaderboardPointsGql[];
  points: PointsGql[];
}

export class LeaderboardGqlDto extends SummaryGqlDto {
  userStats: UserStatsGql[];
  winnerWinrate: UserStatsGql[];
  winnerVolume: UserStatsGql[];
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
  config: LeaderboardConfigDocument;
  summary: LeaderboardSummaryDto;
  user: LeaderboardUserDto;
}

export class LeaderboardResponse extends LeaderboardSummaryResponse {
  winners: UserStatsGql[];
  winnersWinrate: UserStatsGql[];
  winnersVolume: UserStatsGql[];
  losers: UserStatsGql[];
}
