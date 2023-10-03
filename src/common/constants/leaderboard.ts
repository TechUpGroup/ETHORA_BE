import { ChainId } from "common/enums/network.enum";
import { TournamentConfigType } from "common/interfaces/leaderboard.interface";

export const DailyTournamentConfig: {
  [key: number]: TournamentConfigType;
} = {
  [ChainId.base]: {
    startTimestamp: 1675958400000,
    endDay: 9,
    rewardFixedAmount: "0",
    poolPercent: "5",
    minTradesToQualifyPNL: 5,
  },
  [ChainId.goerli]: {
    startTimestamp: 1675958400000,
    endDay: 12,
    rewardFixedAmount: "0",
    poolPercent: "5",
    minTradesToQualifyPNL: 3,
  },
};

export const WeeklyTournamentConfig: {
  [key: number]: TournamentConfigType;
} = {
  [ChainId.base]: {
    startTimestamp: 1676908800000,
    endDay: 1,
    rewardFixedAmount: "0",
    poolPercent: "0",
    winrateStartWeek: undefined,
    minTradesToQualifyPNL: 5,
    minTradesToQualifyWinrate: 5,
    minVolumeToQualifyWinrate: "100000000",
  },
  [ChainId.goerli]: {
    startTimestamp: 1676908800000,
    endDay: 9,
    rewardFixedAmount: "1000",
    poolPercent: "5",
    winrateStartWeek: 5,
    minTradesToQualifyPNL: 3,
    minTradesToQualifyWinrate: 5,
    minVolumeToQualifyWinrate: "100000000",
  },
};