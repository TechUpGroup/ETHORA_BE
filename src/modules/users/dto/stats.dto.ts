import { ApiProperty } from "@nestjs/swagger";
import { IsEthereumAddress, IsOptional } from "class-validator";
import { ToLowerCase, Trim } from "common/decorators/transforms.decorator";
import { NetworkDto } from "common/dto/network.dto";

export interface UserStatsGql {
  user: string;
  totalTrades: any;
  netPnL: any;
  volume: any;
  usdcNetPnL: any;
  usdcTotalTrades: any;
  usdcTradesWon: any;
  usdcVolume: any;
  usdcWinRate: any;
  etrNetPnL: any;
  etrTotalTrades: any;
  etrTradesWon: any;
  etrVolume: any;
  etrWinRate: any;
}

export interface MetricsGql {
  userStatsDaily: Array<UserStatsGql>;
  userStatsWeekly: Array<UserStatsGql>;
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
    totalTradesReferredETR: any;
    totalVolumeOfReferredTradesETR: any;
    totalRebateEarnedETR: any;
    totalTradingVolumeETR: any;
    totalDiscountAvailedETR: any;
  }>;
  activeData: Array<{
    optionContract: {
      address: string;
      token: string;
    };
    totalFee: any;
  }>;
}

export class UserStatsRequest extends NetworkDto {
  @ApiProperty()
  @ToLowerCase()
  @IsOptional()
  @Trim()
  @IsEthereumAddress()
  userAddress?: string;
}

export interface UserMetrics {
  contract: string;
  totalPayout: number;
  netPnl: number;
  openInterest: number;
  volume: number;
}

export interface UserStatsResponse {
  stats: {
    daily: number | null;
    weekly: number | null;
    winTrade: number;
    totalTrade: number;
    mostTradedContract: string | null;
  };
  metrics: {
    referral: {
      totalRebateEarned: number;
      totalVolumeTrades: number;
      totalTrades: number;
      tier: number;
    };
    [key: string]: UserMetrics | any;
  };
}
