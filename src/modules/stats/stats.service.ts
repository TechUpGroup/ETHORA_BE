import { Injectable } from "@nestjs/common";
import { StatsRequest } from "./dto/stats.dto";
import config from "common/config";
import { readFile } from "common/utils/string";
import request from "graphql-request";
import { getDates, getLinuxTimestampBefore24Hours } from "common/utils/date";
import { chain, maxBy, minBy, sortBy, sumBy } from "lodash";
import { fillNa } from "common/utils";

const MOVING_AVERAGE_DAYS = 7;
const MOVING_AVERAGE_PERIOD = 86400 * MOVING_AVERAGE_DAYS;

@Injectable()
export class StatsService {
  constructor() {}

  async getStats(query: StatsRequest): Promise<any> {
    const { network, start, end } = query;
    const graphql = config.getGraphql(network);

    const dateArr = getDates(new Date(query.start * 1000), new Date(query.end * 1000), { onlyDate: true });

    // stats data
    const statsGql = readFile("./graphql/stats.gql", __dirname);
    const {
      userStats,
      userStatsAllTime,
      USDCstats,
      USDC24stats,
      tradingStatsOverview,
      tradingStats,
      volumeStats,
      feeStats,
    }: any = await request<any>(graphql.uri, statsGql, {
      timestamp_start: start,
      timestamp_end: end,
      timestamp_24h: getLinuxTimestampBefore24Hours(),
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });

    // fees
    const USDC24hrsStats = {
      ...USDC24stats?.reduce(
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
    const usersData = (() => {
      let cumulativeNewUserCount = 0;
      return userStatsAllTime
        ? sortBy(userStatsAllTime, "timestamp").map((item) => {
            cumulativeNewUserCount += item.uniqueCount;
            const oldCount = item.existingCount;
            const totalCount = item.uniqueCount + oldCount;
            const oldPercent = ((oldCount / totalCount) * 100).toFixed(1);
            return {
              all: item.uniqueCount + oldCount,
              newCount: item.uniqueCount,
              uniqueSum: 0,
              oldCount,
              oldPercent,
              cumulativeNewUserCount,
              ...item,
              timestamp: item.timestamp,
            };
          })
        : [];
    })();
    const totalUsers = usersData[usersData.length - 1]?.cumulativeNewUserCount;
    const prevTotalUsers = usersData[usersData.length - 2]?.cumulativeNewUserCount;
    const totalUsersDelta = totalUsers && prevTotalUsers ? totalUsers - prevTotalUsers : null;
    // payout
    const dataPayoutCalc = this.calcPayoutOverview(tradingStatsOverview);
    const payout = dataPayoutCalc?.data[dataPayoutCalc?.data.length - 1]?.pnlCumulative || 0;
    const payoutDelta = payout - (dataPayoutCalc?.data[dataPayoutCalc?.data.length - 2]?.pnlCumulative || 0);

    // burned
    const burnedGql = readFile("./graphql/burned.gql", __dirname);
    const dataBurned: any = await request<any>(graphql.burnedUri, burnedGql, {
      timestamp_start: start,
      timestamp_end: end,
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });

    // calc pool
    const poolGql = readFile("./graphql/pool.gql", __dirname);
    const dataPool: any = await request<any>(graphql.mainnetDummyUri, poolGql, {
      timestamp_start: 0,
      timestamp_end: end,
    }).catch((error) => {
      console.error(error);
      return {} as any;
    });
    const poolStats = this.calcPoolStats(dataPool.poolStats || []);
    const poolStatsAllTime = this.calcPoolStats(dataPool.poolStatsAllTime || []);
    // calc pool
    const totalPool = poolStatsAllTime.data?.[poolStatsAllTime.data?.length - 1]?.glpSupply || 0;
    const totalPoolDelta = poolStatsAllTime.data?.[poolStatsAllTime.data?.length - 1]?.glpSupplyChange || 0;

    // res overview
    const dataOverview = {
      totalVolume: USDCstats?.totalVolume / 1e6,
      totalVolumeDelta: USDC24hrsStats?.amount / 1e6,
      totalFees: USDCstats?.totalSettlementFees / 1e6,
      totalFeesDelta: USDC24hrsStats?.settlementFee / 1e6,
      totalPool,
      totalPoolDelta,
      totalUsers,
      totalUsersDelta,
      // openInterest: data.dashboardStats?.[0].openInterest / 1e6,
      payout,
      payoutDelta,
    };

    const _tradingStats = this.calcTradersData(tradingStats);
    return {
      USDC24stats,
      volumeStats: this.mappingDateArray(this.calcVolumesData(volumeStats), dateArr, {
        movingAverageAll: 0,
        cumulative: 0,
        timestamp: 0,
        amount: 0,
        VolumeUSDC: 0,
        all: 0,
      }),
      burnedETRs: this.mappingDateArray(this.calcBurned(start, dataBurned?.burnedBFRs || []), dateArr, {
        timestamp: 0,
        cumulative: 0,
        amount: 0,
      }),
      overviewStats: dataOverview,
      poolStats: {
        stats: poolStats.stats || {
          maxGlpAmount: 0,
          minGlpAmount: 0,
          maxRate: 0,
          minRate: 0,
        },
        data: this.mappingDateArray(poolStats.data, dateArr, {
          timestamp: 0,
          rate: 0,
          glpSupply: 0,
          cumulativeGlpSupply: 0,
          glpSupplyChange: 0,
          aumChange: 0,
        }),
      },
      feeStats: this.mappingDateArray(this.calcFeesData(start, feeStats) || [], dateArr, {
        timestamp: 0,
        all: 0,
        cumulative: 0,
        movingAverageAll: 0,
        fee: 0,
      }),
      tradingStats: {
        stats: _tradingStats?.stats || {
          maxProfit: 0,
          maxLoss: 0,
          maxProfitLoss: 0,
          currentProfitCumulative: 0,
          currentLossCumulative: 0,
          maxCurrentCumulativeProfitLoss: 0,
          maxAbsPnl: 0,
          maxAbsCumulativePnl: 0,
        },
        data: this.mappingDateArray(_tradingStats?.data || [], dateArr, {
          profit: 0,
          loss: 0,
          profitCumulative: 0,
          lossCumulative: 0,
          pnl: 0,
          pnlCumulative: 0,
          timestamp: 0,
          currentPnlCumulative: 0,
          currentLossCumulative: 0,
          currentProfitCumulative: 0,
        }),
      },
      userStats: this.mappingDateArray(userStats, dateArr, {
        existingCount: 0,
        uniqueCount: 0,
        uniqueCountCumulative: 0,
        timestamp: 0,
      }),
    } as any;
  }

  private mappingDateArray(data: any[], dateArr: Date[], defaultValue: any) {
    if (!data || !data.length) data = [];
    return dateArr.map((date) => {
      const _data = data.filter((item) => {
        const timestamp = new Date(new Date(item.timestamp * 1000).toISOString().split("T")[0]);
        return timestamp.getTime() === date.getTime();
      });
      return _data && _data.length
        ? {
            ..._data.reduce(
              (pre, current) =>
                Object.assign({}, ...Object.keys(pre).map((e) => ({ [e]: Number(pre[e]) + Number(current[e]) }))),
              defaultValue,
            ),
            timestamp: Math.round(date.getTime() / 1000),
          }
        : {
            ...Object.assign({}, ...Object.keys(defaultValue).map((e) => ({ [e]: 0 }))),
            timestamp: Math.round(date.getTime() / 1000),
          };
    });
  }

  private calcBurned(from: any, _data: any) {
    const feesChartData = (() => {
      const PROPS = "amount".split(" ");

      if (!_data) {
        return [];
      }

      const chartData = sortBy(_data, "timestamp").map((item) => {
        const ret: any = { timestamp: item.timestamp };
        let all = 0;
        PROPS.forEach((prop) => {
          if (item[prop]) {
            ret[prop] = +item[prop];
            if (prop === "amount") all += ret[prop];
          }
        });
        ret.all = all;
        ret.liquidation = item.marginAndLiquidation - item.margin;
        // ret.all = PROPS.reduce((memo, prop) => memo + ret[prop], 0)
        // console.log(ret, "ret");
        return ret;
      });

      let cumulative = 0;
      const cumulativeByTs = {};
      return chain(chartData)
        .groupBy((item) => item.timestamp)
        .map((values, timestamp) => {
          const all = sumBy(values, "amount");
          cumulative += all;

          const ret = {
            timestamp: Number(timestamp),
            cumulative: cumulative / 1e18,
          };
          PROPS.forEach((prop) => {
            ret[prop] = sumBy(values, prop) / 1e18;
          });
          cumulativeByTs[timestamp] = cumulative;
          return ret;
        })
        .value()
        .filter((item) => item.timestamp >= from);
    })();

    return feesChartData;
  }

  private calcFeesData(from: any, _data: any) {
    const PROPS = "fee".split(" ");

    const feesChartData = (() => {
      if (!_data) {
        return [];
      }

      const chartData = sortBy(_data, "timestamp").map((item) => {
        const ret: any = { timestamp: item.timestamp };

        PROPS.forEach((prop) => {
          if (item[prop]) {
            ret[prop] = +item[prop];
          }
        });

        ret.liquidation = item.marginAndLiquidation - item.margin;
        ret.all = PROPS.reduce((memo, prop) => memo + ret[prop], 0);
        return ret;
      });

      let cumulative = 0;
      const cumulativeByTs = {};
      return chain(chartData)
        .groupBy((item) => item.timestamp)
        .map((values, timestamp: any) => {
          const all = sumBy(values, "all");
          cumulative += all;

          let movingAverageAll;
          const movingAverageTs = timestamp - MOVING_AVERAGE_PERIOD;
          if (movingAverageTs in cumulativeByTs) {
            movingAverageAll = (cumulative - cumulativeByTs[movingAverageTs]) / MOVING_AVERAGE_DAYS;
          }

          const ret = {
            timestamp: Number(timestamp),
            all: all / 1e6,
            cumulative: cumulative / 1e6,
            movingAverageAll,
          };
          PROPS.forEach((prop) => {
            ret[prop] = sumBy(values, prop) / 1e6;
          });
          cumulativeByTs[timestamp] = cumulative;
          return ret;
        })
        .value()
        .filter((item) => item.timestamp >= from);
    })();

    return feesChartData;
  }

  private calcVolumesData(_data: any) {
    const PROPS = "amount VolumeUSDC".split(" ");
    const timestampProp = "timestamp";

    const data = (() => {
      if (!_data) {
        return null;
      }

      const ret: any = sortBy(_data, timestampProp).map((item) => {
        const ret: any = { timestamp: item[timestampProp] };
        let all = 0;
        PROPS.forEach((prop) => {
          ret[prop] = +item[prop] / 1e6;
          if (prop === "amount") all += ret[prop];
        });
        ret.all = all;
        return ret;
      });

      let cumulative = 0;
      const cumulativeByTs = {};
      return ret.map((item) => {
        cumulative += item.all;

        let movingAverageAll;
        const movingAverageTs = item.timestamp - MOVING_AVERAGE_PERIOD;
        if (movingAverageTs in cumulativeByTs) {
          movingAverageAll = (cumulative - cumulativeByTs[movingAverageTs]) / MOVING_AVERAGE_DAYS;
        }

        return {
          movingAverageAll,
          cumulative,
          ...item,
        };
      });
    })();

    return data;
  }

  private calcTradersData(_data: any) {
    let currentPnlCumulative = 0;
    let currentProfitCumulative = 0;
    let currentLossCumulative = 0;

    const data =
      _data && _data.length
        ? sortBy(_data, (i) => i.timestamp).map((dataItem) => {
            const profit = +dataItem.profitUSDC / 1e6;
            const loss = +dataItem.lossUSDC / 1e6;
            const profitCumulative = +dataItem.profitCumulativeUSDC / 1e6;
            const lossCumulative = +dataItem.lossCumulativeUSDC / 1e6;
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
      // console.log(data,'data')
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

  private calcPayoutOverview(_data: any) {
    let currentPnlCumulative = 0;
    let currentProfitCumulative = 0;
    let currentLossCumulative = 0;

    const data =
      _data && _data.length
        ? sortBy(_data, (i) => i.timestamp).map((dataItem) => {
            const profit = +dataItem.profit / 1e6;
            const loss = +dataItem.loss / 1e6;
            const profitCumulative = +dataItem.profitCumulative / 1e6;
            const lossCumulative = +dataItem.lossCumulative / 1e6;
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
      // console.log(data,'data')
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

  private calcPoolStats(_data: any) {
    let stats: any = null;
    let cumulativeGlpSupply = 0;
    const timestampProp = "timestamp";

    const data: any = (() => {
      if (!_data || !_data.length) {
        return null;
      }

      let prevGlpSupply;
      let prevAum;
      let ret = sortBy(_data, (item) => item[timestampProp])
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

    if (data) {
      const maxGlpAmount = maxBy(data, (item: any) => item.glpSupply)?.glpSupply;
      const minGlpAmount = minBy(data, (item: any) => item.glpSupply)?.glpSupply;
      const maxRate = maxBy(data, (item: any) => item.rate)?.rate;
      const minRate = minBy(data, (item: any) => item.rate)?.rate;
      stats = {
        maxGlpAmount,
        minGlpAmount,
        maxRate,
        minRate,
      };
    }

    return { data, stats };
  }
}
