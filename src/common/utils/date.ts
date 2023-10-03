import { DailyTournamentConfig, WeeklyTournamentConfig } from "common/constants/leaderboard";
import { ChainId } from "common/enums/network.enum";

const MSINWEEK = 604800000;

export const getTimeLeftOfDay = () => {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const endDateTime = new Date(`${currentDate}T23:59:59.999Z`);

  return {
    ms: endDateTime.getTime() - now.getTime(),
    date: endDateTime,
  };
};

export const getTimeLeftOfWeek = () => {
  const now = new Date();
  const endDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  const endDateTime = new Date(`${endDayOfWeek.toISOString().split("T")[0]}T23:59:59.999Z`);

  return {
    ms: endDateTime.getTime() - now.getTime(),
    date: endDateTime,
  };
};

export function getDayId(offset: number = 0): number {
  let timestamp = new Date().getTime() / 1000;
  if (offset > 0) {
    timestamp = timestamp - offset * 86400;
  }
  const dayTimestamp = Math.floor((timestamp - 16 * 3600) / 86400);
  return dayTimestamp;
}

export const useDayOfTournament = (chain: ChainId) => {
  const { startTimestamp } = DailyTournamentConfig[chain];
  const currentTimeStamp = new Date().getTime();
  return {
    day: Math.floor((currentTimeStamp - startTimestamp) / (1000 * 60 * 60 * 24)) + 1,
    nextTimeStamp:
      startTimestamp +
      1000 * 60 * 60 * 24 * (Math.floor((currentTimeStamp - startTimestamp) / (1000 * 60 * 60 * 24)) + 1),
  };
};

export function getWeekId(offset: number = 0): number {
  let timestamp = new Date().getTime() / 1000;
  if (offset > 0) {
    timestamp = timestamp - offset * (86400 * 7);
  }
  const dayTimestamp = Math.floor((timestamp - 4 * 86400 - 16 * 3600) / (86400 * 7));
  return dayTimestamp;
}
3;

export const useWeekOfTournament = (chain: ChainId) => {
  const { startTimestamp } = WeeklyTournamentConfig[chain];
  const currentTimeStamp = new Date().getTime();

  return {
    week: Math.floor((currentTimeStamp - startTimestamp) / MSINWEEK) + 1,
    nextTimeStamp: startTimestamp + MSINWEEK * (Math.floor((currentTimeStamp - startTimestamp) / MSINWEEK) + 1),
  };
};

export const getCurrentDayIndex = (chain: ChainId, offset?: number) => {
  const { day } = useDayOfTournament(chain);
  return Number(day - Number(offset ?? day));
};

export const getCurrentWeekIndex = (chain: ChainId, offset?: number) => {
  const { week } = useWeekOfTournament(chain);
  return Number(week - Number(offset ?? week));
};

export const getDayTimestamp = (chain: ChainId, offset?: number) => {
  const day = getCurrentDayIndex(chain, offset);
  return getDayId(day);
};

export const getWeekTimestamp = (chain: ChainId, offset?: number) => {
  const week = getCurrentWeekIndex(chain, offset);
  return getWeekId(week);
};
