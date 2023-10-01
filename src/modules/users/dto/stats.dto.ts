import { BaseTradesRequest } from "modules/trades/dto/trades.dto";

export interface MetricsGql {
  userStatsDaily: Array<{
    user: string;
    totalTrades: any;
    netPnL: any;
    volume: any;
    usdcNetPnL: any;
    usdcTotalTrades: any;
    usdcTradesWon: any;
    usdcVolume: any;
    usdcWinRate: any;
    bfrNetPnL: any;
    bfrTotalTrades: any;
    bfrTradesWon: any;
    bfrVolume: any;
    bfrWinRate: any;
    arbNetPnL: any;
    arbTotalTrades: any;
    arbTradesWon: any;
    arbVolume: any;
    arbWinRate: any;
  }>;
  userStatsWeekly: Array<{
    user: any;
    totalTrades: any;
    netPnL: any;
    volume: any;
    usdcNetPnL: any;
    usdcTotalTrades: any;
    usdcTradesWon: any;
    usdcVolume: any;
    usdcWinRate: any;
    bfrNetPnL: any;
    bfrTotalTrades: any;
    bfrTradesWon: any;
    bfrVolume: any;
    bfrWinRate: any;
    arbNetPnL: any;
    arbTotalTrades: any;
    arbTradesWon: any;
    arbVolume: any;
    arbWinRate: any;
  }>;
  userOptionDatas: Array<{
    optionContract: {
      address: any;
      token: any;
      asset: any;
    };
    payout: any;
    totalFee: any;
    expirationTime: any;
  }>;
  referralDatas: Array<{
    totalTradesReferred: any;
    totalVolumeOfReferredTrades: any;
    totalRebateEarned: any;
    totalTradingVolume: any;
    totalDiscountAvailed: any;
    totalTradesReferredUSDC: any;
    totalVolumeOfReferredTradesUSDC: any;
    totalRebateEarnedUSDC: any;
    totalTradingVolumeUSDC: any;
    totalDiscountAvailedUSDC: any;
    totalTradesReferredBFR: any;
    totalVolumeOfReferredTradesBFR: any;
    totalRebateEarnedBFR: any;
    totalTradingVolumeBFR: any;
    totalDiscountAvailedBFR: any;
    totalTradesReferredARB: any;
    totalVolumeOfReferredTradesARB: any;
    totalRebateEarnedARB: any;
    totalTradingVolumeARB: any;
    totalDiscountAvailedARB: any;
  }>;
  activeData: Array<{
    optionContract: {
      address: string;
      token: string;
    };
    totalFee: any;
  }>;
}

export class UserStatsRequest extends BaseTradesRequest {}

export interface UserMetrics {
  contract: string;
  totalPayout: number;
  netPnl: number;
  openInterest: number;
  volume: number;
}

export interface UserStatsResponse {
  stats: {
    daily: number;
    weekly: number;
    winTrade: number;
    totalTrade: number;
    mostTradedContract: string | null;
  };
  metrics: {
    referral: {
      totalRebateEarned: number;
      totalVolumeOfReferredTrades: number;
      totalTradesReferred: number;
      totalTradesReferredDetail: {
        [key: string]: number;
      } | null;
    };
    [key: string]: UserMetrics | any;
  };
}
