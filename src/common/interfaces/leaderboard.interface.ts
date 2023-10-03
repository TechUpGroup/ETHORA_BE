export type TournamentConfigType = {
  startTimestamp: number;
  endDay: number | undefined;
  contestRules?: string;
  rewardFixedAmount: string;
  poolPercent: string;
  minTradesToQualifyPNL: number;
  minTradesToQualifyWinrate?: number;
  winrateStartWeek?: number | undefined;
  minVolumeToQualifyWinrate?: string | undefined;
};
