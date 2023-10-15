import { Injectable } from "@nestjs/common";
import { StatsRequest } from "./dto/stats.dto";
import config from "common/config";
import { readFile } from "common/utils/string";
import request from "graphql-request";
import { getLinuxTimestampBefore24Hours } from "common/utils/date";
import { maxBy, minBy, sortBy } from "lodash";
import { fillNa } from "common/utils";

@Injectable()
export class StatsService {
  constructor() {}

  async getStats(query: StatsRequest): Promise<any> {
    const { network, start, end } = query;
    const graphql = config.getGraphql(network);

    // overview
    const overviewGql = readFile("./graphql/stats.gql", __dirname);
    const data: any = await request<any>(graphql.uri, overviewGql, {
      timestamp_start: start,
      timestamp_end: end,
      timestamp_24h: getLinuxTimestampBefore24Hours(),
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });

    // burned
    const burnedGql = readFile("./graphql/burned.gql", __dirname);
    const dataBurned: any = await request<any>(graphql.burnedUri, burnedGql, {
      timestamp_start: start,
      timestamp_end: end,
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });

    // pool
    const poolGql = readFile("./graphql/pool.gql", __dirname);
    const dataPool: any = await request<any>(graphql.mainnetDummyUri, poolGql, {
      timestamp_start: start,
      timestamp_end: end,
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });
    // calc pool

    return {
      ...data,
      burnedBFRs: dataBurned?.burnedBFRs || [],
      poolStats: this.calcPoolStats(dataPool || { poolStats: [] }),
    } as any;
  }

  private calcPoolStats(data: any) {
    let stats: any = null;
    let cumulativeGlpSupply = 0;
    const timestampProp = "timestamp";

    const glpChartData: any = (() => {
      if (!data) {
        return null;
      }

      let prevGlpSupply;
      let prevAum;
      let ret = sortBy(data.poolStats, (item) => item[timestampProp])
        .reduce((memo, item) => {
          const last = memo[memo.length - 1];

          // const aum = Number(item.aumInUsdg) / 1e18
          const glpSupply = Number(item.amount);
          const rate = Number(item.rate) / 1e8;

          cumulativeGlpSupply += +glpSupply;

          // const glpPrice = aum / glpSupply
          const timestamp = parseInt(item[timestampProp]);

          const newItem = {
            timestamp,
            // aum,
            rate,
            glpSupply: glpSupply / 1e6,
            cumulativeGlpSupply: cumulativeGlpSupply / 1e6,
          };

          if (last && last.timestamp === timestamp) {
            memo[memo.length - 1] = newItem;
          } else {
            memo.push(newItem);
          }

          return memo;
        }, [])
        .map((item) => {
          let { glpSupply, aum } = item;
          if (!glpSupply) {
            glpSupply = prevGlpSupply;
          }
          if (!aum) {
            aum = prevAum;
          }
          item.glpSupplyChange = prevGlpSupply ? Number(glpSupply) - Number(prevGlpSupply) : 0;
          if (item.glpSupplyChange > 1000) {
            item.glpSupplyChange = 0;
          }
          item.aumChange = prevAum ? ((aum - prevAum) / prevAum) * 100 : 0;
          if (item.aumChange > 1000) {
            item.aumChange = 0;
          }
          prevGlpSupply = glpSupply;
          prevAum = aum;
          return item;
        });

      ret = fillNa(ret);
      return ret;
    })();

    if (glpChartData) {
      const maxGlpAmount = maxBy(glpChartData, (item: any) => item.glpSupply)?.glpSupply;
      const minGlpAmount = minBy(glpChartData, (item: any) => item.glpSupply)?.glpSupply;
      const maxRate = maxBy(glpChartData, (item: any) => item.rate)?.rate;
      const minRate = minBy(glpChartData, (item: any) => item.rate)?.rate;
      stats = {
        maxGlpAmount,
        minGlpAmount,
        maxRate,
        minRate,
      };
    }

    return { glpChartData, stats };
  }
}
