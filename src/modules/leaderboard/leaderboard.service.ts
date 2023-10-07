import { Injectable } from "@nestjs/common";
import config from "common/config";
import { Network } from "common/enums/network.enum";
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

  async getOffsets(network: Network): Promise<any> {
    return {
      dailyOffset: getCurrentDayIndex(network, 0),
      weeklyOffset: getCurrentWeekIndex(network, 0),
      dailyId: getDayId(),
      weeklyId: getWeekId(),
    };
  }

  getSummary(network: Network, type: LeaderboardType, data: LeaderboardGqlDto): LeaderboardSummaryResponse {
    const endDateTime = type === LeaderboardType.DAILY ? getTimeLeftOfDay() : getTimeLeftOfWeek();
    const configValue = type === LeaderboardType.DAILY ? DailyTournamentConfig[network] : WeeklyTournamentConfig[network];
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
    const { network, offset, type } = query;
    let data: LeaderboardGqlDto;
    if (type === LeaderboardType.DAILY) {
      const timestamp = getDayTimestamp(network, offset);
      data = await this.getDaily(network, address, timestamp + "");
    } else {
      const timestamp = getWeekTimestamp(network, offset);
      data = await this.getWeekly(network, address, timestamp + "");
    }

    return {
      winners: data.userStats,
      losers: data.loserStats,
      ...this.getSummary(network, type, data),
    };
  }

  private async getDaily(network: Network, address: string, timestamp: string) {
    const graphql = config.getGraphql(network);
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

  private async getWeekly(network: Network, address, timestamp: string) {
    const graphql = config.getGraphql(network);
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
