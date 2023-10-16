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

    // stats data
    const statsGql = readFile("./graphql/stats.gql", __dirname);
    const data: any = await request<any>(graphql.uri, statsGql, {
      timestamp_start: start,
      timestamp_end: end,
      timestamp_24h: getLinuxTimestampBefore24Hours(),
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });

    // calc overview
    const dataPayoutCalc = this.calcOverview(data.tradingStatsOverview);

    // fees
    const USDC24hrsStats = {
      ...data.USDC24stats.reduce(
        (acc, curr) => {
          return {
            amount: +acc.amount + +curr.amount,
            settlementFee: +acc.settlementFee + +curr.settlementFee,
          };
        },
        { amount: "0", settlementFee: "0" },
      ),
    };
    // user
    const usersData = data.userStats;
    const totalUsers = usersData[usersData.length - 1]?.cumulativeNewUserCount;
    const prevTotalUsers = usersData[usersData.length - 2]?.cumulativeNewUserCount;
    const totalUsersDelta = totalUsers && prevTotalUsers ? totalUsers - prevTotalUsers : null;
    // payout
    const payout = dataPayoutCalc?.data[dataPayoutCalc?.data.length - 1]?.pnlCumulative || 0;
    const payoutDelta = payout - (dataPayoutCalc?.data[dataPayoutCalc?.data.length - 2]?.pnlCumulative || 0);
    // res overview
    const dataOverview = {
      totalVolume: data.USDCstats.totalVolume / 1e6,
      totalVolumeDelta: USDC24hrsStats.amount,
      totalFees: data.USDCstats.totalSettlementFees / 1e6,
      totalFeesDelta: USDC24hrsStats.settlementFee,
      totalUsers,
      totalUsersDelta,
      // openInterest: data.dashboardStats?.[0].openInterest / 1e6,
      payout,
      payoutDelta,
    };

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
      overviewStats: dataOverview,
      burnedBFRs: dataBurned?.burnedBFRs || [],
      poolStats: this.calcPoolStats(dataPool || { poolStats: [] }),
    } as any;
  }

  private calcOverview(_data: any) {
    let currentPnlCumulative = 0;
    let currentProfitCumulative = 0;
    let currentLossCumulative = 0;

    const data =
      _data && _data.length
        ? sortBy(_data, (i) => i.timestamp).map((dataItem) => {
            const profit = +dataItem.profitBFR / 1e6;
            const loss = +dataItem.lossBFR / 1e6;
            const profitCumulative = +dataItem.profitCumulativeBFR / 1e6;
            const lossCumulative = +dataItem.lossCumulativeBFR / 1e6;
            const pnlCumulative = profitCumulative - lossCumulative;
            const pnl = profit - loss;
            currentProfitCumulative += profit;
            currentLossCumulative -= loss;
            currentPnlCumulative += pnl;
            return {
              profit,
              loss: -loss,
              profitCumulative,
              lossCumulative: -lossCumulative,
              pnl,
              pnlCumulative,
              timestamp: dataItem.timestamp,
              currentPnlCumulative,
              currentLossCumulative,
              currentProfitCumulative,
            };
          })
        : null;

    if (data) {
      const maxProfit = maxBy(data, (item) => item.profit)?.profit || 0;
      const maxLoss = minBy(data, (item) => item.loss)?.loss || 0;
      const maxProfitLoss = Math.max(maxProfit, -maxLoss);

      const maxPnl = maxBy(data, (item) => item.pnl)?.pnl || 0;
      const minPnl = minBy(data, (item) => item.pnl)?.pnl || 0;
      const maxCurrentCumulativePnl = maxBy(data, (item) => item.currentPnlCumulative)?.currentPnlCumulative || 0;
      const minCurrentCumulativePnl = minBy(data, (item) => item.currentPnlCumulative)?.currentPnlCumulative || 0;

      const currentProfitCumulative = data[data.length - 1].currentProfitCumulative;
      const currentLossCumulative = data[data.length - 1].currentLossCumulative;
      const stats = {
        maxProfit,
        maxLoss,
        maxProfitLoss,
        currentProfitCumulative,
        currentLossCumulative,
        maxCurrentCumulativeProfitLoss: Math.max(currentProfitCumulative, -currentLossCumulative),

        maxAbsPnl: Math.max(Math.abs(maxPnl), Math.abs(minPnl)),
        maxAbsCumulativePnl: Math.max(Math.abs(maxCurrentCumulativePnl), Math.abs(minCurrentCumulativePnl)),
      };

      return {
        data,
        stats,
      };
    }
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
