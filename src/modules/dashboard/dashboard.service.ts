import { Injectable } from "@nestjs/common";
import { Network } from "common/enums/network.enum";
import { DashboardOverviewGql, DashboardResponse } from "./dto/dashboard.dto";
import config from "common/config";
import { readFile } from "common/utils/string";
import request from "graphql-request";
import { getLinuxTimestampBefore24Hours } from "common/utils/date";

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
    // TODO: fake
    const openInterest = {
      OIstats: {
        totalVolume: "0",
      },
      USDCIOstats: {
        totalVolume: "0",
      },
      ETRIOstats: {
        totalVolume: "0",
      },
    };

    return {
      tradingStartDate: config.trading.startDate,
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
