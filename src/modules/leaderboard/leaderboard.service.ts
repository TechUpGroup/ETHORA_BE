import { Injectable } from "@nestjs/common";
import config from "common/config";
import { ChainId, Network } from "common/enums/network.enum";
import { readFile } from "common/utils/string";
import { request } from "graphql-request";
import {
  LeaderboardGqlDto,
  LeaderboardRequest,
  LeaderboardResponse,
  LeaderboardSummaryResponse,
} from "./dto/leaderboard.dto";
import {
  getCurrentDayIndex,
  getCurrentWeekIndex,
  getDayId,
  getDayTimestamp,
  getTimeLeftOfDay,
  getTimeLeftOfWeek,
  getWeekId,
  getWeekTimestamp,
} from "common/utils/date";
import { LeaderboardType } from "common/enums/leaderboard.enums";
import { DailyTournamentConfig, WeeklyTournamentConfig } from "common/constants/leaderboard";
import BigNumber from "bignumber.js";

@Injectable()
export class LeaderboardService {
  constructor() {}

  async getOffsets(chain: ChainId): Promise<any> {
    return {
      dailyOffset: getCurrentDayIndex(chain, 0),
      weeklyOffset: getCurrentWeekIndex(chain, 0),
      dailyId: getDayId(),
      weeklyId: getWeekId(),
    };
  }

  getSummary(chain: ChainId, type: LeaderboardType, data: LeaderboardGqlDto): LeaderboardSummaryResponse {
    const endDateTime = type === LeaderboardType.DAILY ? getTimeLeftOfDay() : getTimeLeftOfWeek();
    const configValue = type === LeaderboardType.DAILY ? DailyTournamentConfig[chain] : WeeklyTournamentConfig[chain];
    // calc summary
    const summary: LeaderboardSummaryResponse["summary"] = {
      // TODO: calc totalRewardPool
      totalRewardPool: "0",
      timeLeftByMs: endDateTime.ms,
      endDate: endDateTime.date,
      totalUserTrades: 0,
      totalTrades: 0,
      totalVolume: "0",
    };
    data.totalData?.forEach((e) => {
      summary.totalTrades += e.totalTrades;
      summary.totalVolume = new BigNumber(e.volume).plus(new BigNumber(summary.totalVolume)).toString();
    });
    summary.totalUserTrades = data.totalData?.length || 0;
    summary.totalRewardPool = new BigNumber(configValue.rewardFixedAmount)
      .plus(new BigNumber(data.reward?.[0]?.settlementFee || 0).times(+configValue.poolPercent / 100))
      .toFixed(0)
      .toString();

    return {
      summary,
      user: data.userData?.[0] || null,
    };
  }

  async getLeaderboard(address: string, query: LeaderboardRequest): Promise<LeaderboardResponse> {
    const { chain, offset, type } = query;
    let data: LeaderboardGqlDto;
    if (type === LeaderboardType.DAILY) {
      const timestamp = getDayTimestamp(chain, offset);
      data = await this.getDaily(chain, address, timestamp + "");
    } else {
      const timestamp = getWeekTimestamp(chain, offset);
      data = await this.getWeekly(chain, address, timestamp + "");
    }

    return {
      winners: data.userStats,
      losers: data.loserStats,
      ...this.getSummary(chain, type, data),
    };
  }

  private async getDaily(chain: ChainId, address: string, timestamp: string) {
    const graphql = config.getGraphql(Object.keys(ChainId)[Object.values(ChainId).indexOf(chain)] as Network);
    const metricsGql = readFile("./graphql/daily.gql", __dirname);
    const data: LeaderboardGqlDto = await request<LeaderboardGqlDto>(graphql.uri, metricsGql, {
      timestamp,
      address,
      timestampReward: `${timestamp}USDC`,
    }).catch((error) => {
      console.error(error);
      return {} as LeaderboardGqlDto;
    });

    return data;
  }

  private async getWeekly(chain: ChainId, address, timestamp: string) {
    const graphql = config.getGraphql(Object.keys(ChainId)[Object.values(ChainId).indexOf(chain)] as Network);
    const metricsGql = readFile("./graphql/weekly.gql", __dirname);
    const data: LeaderboardGqlDto = await request<LeaderboardGqlDto>(graphql.uri, metricsGql, {
      timestamp,
      address,
      timestampReward: `${timestamp}USDC`,
    }).catch((error) => {
      console.error(error);
      return {} as LeaderboardGqlDto;
    });

    return data;
  }
}
