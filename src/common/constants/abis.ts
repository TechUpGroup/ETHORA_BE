import { BtcusdBinaryOptions__factory } from "common/abis/types";

export const PAIR_CONTRACT_ABIS: { [key: string]: typeof BtcusdBinaryOptions__factory | undefined } = {
  // Forex
  EURUSD: undefined,
  GBPUSD: undefined,
  AUDUSD: undefined,
  USDJPY: undefined,
  EURJPY: undefined,
  GBPJPY: undefined,
  NZDUSD: undefined,
  USDICHE: undefined,
  USDICAD: undefined,
  // Crypto
  BTCUSD: BtcusdBinaryOptions__factory,
  BICUSD: undefined,
  ETHUSD: undefined,
  ETHBTC: undefined,
  LINKUSD: undefined,
};
