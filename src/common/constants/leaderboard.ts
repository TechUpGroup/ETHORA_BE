import { Network } from "common/enums/network.enum";
import { TournamentConfigType } from "common/interfaces/leaderboard.interface";

export const DailyTournamentConfig: {
  [key: number]: TournamentConfigType;
} = {
  [Network.base]: {
    startTimestamp: 1675958400000,
    endDay: 9,
    rewardFixedAmount: "0",
    poolPercent: "5",
    minTradesToQualifyPNL: 5,
  },
  [Network.goerli]: {
    startTimestamp: 1700524800000,
    endDay: 12,
    rewardFixedAmount: "0",
    poolPercent: "5",
    minTradesToQualifyPNL: 3,
  },
};

export const WeeklyTournamentConfig: {
  [key: number]: TournamentConfigType;
} = {
  [Network.base]: {
    startTimestamp: 1676908800000,
    endDay: 1,
    rewardFixedAmount: "0",
    poolPercent: "0",
    winrateStartWeek: undefined,
    minTradesToQualifyPNL: 5,
    minTradesToQualifyWinrate: 5,
    minVolumeToQualifyWinrate: "100000000",
  },
  [Network.goerli]: {
    startTimestamp: 1700524800000,
    endDay: 9,
    rewardFixedAmount: "0",
    poolPercent: "10",
    winrateStartWeek: 5,
    minTradesToQualifyPNL: 3,
    minTradesToQualifyWinrate: 5,
    minVolumeToQualifyWinrate: "100000000",
  },
};
