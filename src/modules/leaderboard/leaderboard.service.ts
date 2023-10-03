import { Injectable } from "@nestjs/common";
import config from "common/config";
import { ChainId, Network } from "common/enums/network.enum";
import { readFile } from "common/utils/string";
import { request } from "graphql-request";
import { MetricsGql } from "modules/users/dto/stats.dto";

@Injectable()
export class LeaderboardService {
  constructor() {}

  async getDaily(chain: ChainId) {
    const graphql = config.getGraphql(Object.keys(ChainId)[Object.values(ChainId).indexOf(chain)] as Network);
    const metricsGql = readFile("./graphql/daily.gql", __dirname);
    const data: MetricsGql = await request<MetricsGql>(graphql.uri, metricsGql).catch((error) => {
      console.error(error);
      return {} as MetricsGql;
    });

    return {
      docs: data.userStatsDaily || [],
    };
  }

  async getWeekly(chain: ChainId) {
    const graphql = config.getGraphql(Object.keys(ChainId)[Object.values(ChainId).indexOf(chain)] as Network);
    const metricsGql = readFile("./graphql/weekly.gql", __dirname);
    const data: MetricsGql = await request<MetricsGql>(graphql.uri, metricsGql).catch((error) => {
      console.error(error);
      return {} as MetricsGql;
    });

    return {
      docs: data.userStatsWeekly || [],
    };
  }
}
