import { Injectable } from "@nestjs/common";
import { StatsRequest } from "./dto/stats.dto";
import config from "common/config";
import { readFile } from "common/utils/string";
import request from "graphql-request";
import { getLinuxTimestampBefore24Hours } from "common/utils/date";

@Injectable()
export class StatsService {
  constructor() {}

  async getStats(query: StatsRequest): Promise<any> {
    const { network, start, end } = query;
    const graphql = config.getGraphql(network);
    const overviewGql = readFile("./graphql/stats.gql", __dirname);
    const data: any = await request<any>(graphql.uri, overviewGql, {
      timestamp_start: start,
      timestamp_end: end,
      timestamp_24h: getLinuxTimestampBefore24Hours(),
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });

    return data as any;
  }
}
