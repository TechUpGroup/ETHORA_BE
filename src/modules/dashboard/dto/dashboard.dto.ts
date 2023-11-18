export interface DashboardResponse {
  totalVolume: number;
  totalFees: number;
  totalVolume24h: number;
  totalFees24h: number;
  avgDailyVolume: number;
  avgTradeSize: number;
  totalTrades: number;
  openInterest: number;
  totalTrader: number;
}

export interface DashboardStatsGql {
  totalSettlementFees: string;
  totalTrades: number;
  totalVolume: string;
}

export interface Dashboard24hStatsGql {
  amount: string;
  settlementFee: string;
}

export interface DashboardOverviewGql {
  totalStats: DashboardStatsGql;
  USDCstats: DashboardStatsGql;
  ETRstats: DashboardStatsGql;
  ARBstats: DashboardStatsGql;
  totalTraders: [
    {
      uniqueCountCumulative: number;
    },
  ];
  total24stats: Dashboard24hStatsGql[];
  USDC24stats: Dashboard24hStatsGql[];
  ETR24stats: Dashboard24hStatsGql[];
  ARB24stats: Dashboard24hStatsGql[];
  activeData?: any[];
}
