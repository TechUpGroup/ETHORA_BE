import { Injectable } from "@nestjs/common";
import { Network } from "common/enums/network.enum";
import { DashboardOverviewGql, DashboardResponse } from "./dto/dashboard.dto";
import config from "common/config";
import { readFile } from "common/utils/string";
import request from "graphql-request";
import { getLinuxTimestampBefore24Hours } from "common/utils/date";
import { DailyTournamentConfig } from "common/constants/leaderboard";

@Injectable()
export class DashboardService {
  constructor() {}

  async getOverview(network: Network): Promise<DashboardResponse> {
    const graphql = config.getGraphql(network);
    const overviewGql = readFile("./graphql/overview.gql", __dirname);
    const data: DashboardOverviewGql = await request<DashboardOverviewGql>(graphql.uri, overviewGql, {
      prevDayEpoch: getLinuxTimestampBefore24Hours(),
    }).catch((error) => {
      console.error(error);
      return {} as DashboardOverviewGql;
    });

    // Open Interest
    const openInterest = {
      OIstats: {
        totalVolume: data.activeData?.reduce((a, b) => a + Number(b.totalFee), Number(0)).toFixed(0) || "0",
      },
      USDCIOstats: {
        totalVolume:
          data.activeData
            ?.filter((e) => e.optionContract.token === "USDC")
            .reduce((a, b) => a + Number(b.totalFee), Number(0))
            .toFixed(0) || "0",
      },
      ETRIOstats: {
        totalVolume:
          data.activeData
            ?.filter((e) => e.optionContract.token === "ETR")
            .reduce((a, b) => a + Number(b.totalFee), Number(0))
            .toFixed(0) || "0",
      },
    };

    data.activeData = undefined;
    const dailyConfig = DailyTournamentConfig[network];
    return {
      tradingStartDate: new Date(dailyConfig.startTimestamp),
      ...data,
      ...openInterest,
    } as any;
  }

  async getMarkets(network: Network): Promise<DashboardResponse> {
    const graphql = config.getGraphql(network);
    const overviewGql = readFile("./graphql/markets.gql", __dirname);
    const data: DashboardOverviewGql = await request<DashboardOverviewGql>(graphql.uri, overviewGql, {
      timestamp: getLinuxTimestampBefore24Hours() + "",
    }).catch((error) => {
      console.error(error);
      return {} as DashboardOverviewGql;
    });

    return data as any;
  }
}
