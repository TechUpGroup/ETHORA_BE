import BigNumber from "bignumber.js";
import { SETTLEMENT_FEE } from "common/constants/fee";
import { TradesDocument } from "modules/trades/schemas/trades.schema";

/* Calculate Choudhury’s approximation of the Black-Scholes CDF*/
const CDF = (input) => {
  const inputSquared = input * input;
  let CDF_CONST_0, CDF_CONST_1, CDF_CONST_2;
  (CDF_CONST_0 = 2260 / 3989), (CDF_CONST_1 = 6400 / 3989), (CDF_CONST_2 = 3300 / 3989);

  const value =
    Math.exp(-inputSquared / 2) /
    (CDF_CONST_0 + CDF_CONST_1 * Math.abs(input) + CDF_CONST_2 * Math.sqrt(inputSquared + 3));
  return input > 0 ? 1 - value : value;
};

// Calculate the price of an option using the Black-Scholes model
// s= Stock price
// x=Strike price
// t=Years to maturity
// r= Risk-free rate
// v=Volatility
// a=Above
// y=Yes
const BlackScholes = (y, a, s, x, t, r, v) => {
  // console.log(`y, a, s, x, t, r, v: `, y, a, s, x, t, r, v);
  const DAYS_365 = 86400 * 365;
  t = t / DAYS_365;
  const d1 = (Math.log(s / x) + (r + (v * v) / 2.0) * t) / (v * Math.sqrt(t));
  const d2 = d1 - v * Math.sqrt(t);
  if (y) {
    if (a) return CDF(d2);
    else return CDF(-d2);
  } else {
    if (a) return 1 - CDF(d2);
    else return 1 - CDF(-d2);
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getExpiry = (trade: TradesDocument, _deb?: string) => {
  return trade.closeDate?.getTime() || trade.openDate.getTime() / 1000 + trade.period;
};

export const getStrike = (trade: TradesDocument, cachedPrice: any) => {
  let strikePrice = trade.strike;
  const isPriceArrived = trade.isLimitOrder ? false : cachedPrice?.[trade.queueId];
  if (trade.state == "QUEUED" && isPriceArrived) {
    strikePrice = cachedPrice?.[trade.queueId];
  }

  return { isPriceArrived, strikePrice };
};

export const getProbability = (trade: TradesDocument, price: number, IV: number, expiryTs?: string) => {
  const currentEpoch = Math.round(Date.now() / 1000);
  const expiryTime = getExpiry(trade, expiryTs);

  return getProbabilityByTime(trade, price, currentEpoch, expiryTime, IV);
};

export const getProbabilityByTime = (
  trade: TradesDocument,
  price: number,
  currentTime: number,
  expirationTime: number,
  IV: number,
) => {
  const probability =
    BlackScholes(true, trade.isAbove, price, +trade.strike / 100000000, expirationTime - currentTime, 0, IV) * 100;

  return probability;
};

export const calcLockedAmount = async (contract, userAddress: string, data: TradesDocument | any) => {
  const optionParams = {
    strike: BigNumber(data.strike).toFixed(0),
    amount: 0,
    period: data.period,
    allowPartialFill: data.allowPartialFill,
    totalFee: data.tradeSize,
    user: userAddress,
    referralCode: data.referralCode || "",
    baseSettlementFeePercentage: SETTLEMENT_FEE[data.pair.replace("-", "").toUpperCase()],
  };
  try {
    const [amount] = await contract.evaluateParams(
      optionParams,
      data.slippage,
    );
    return BigNumber(amount.toString()).toFixed(0);
  } catch (e) {
    throw e;
  }
};

export const checkDateTrade = (currentDate: Date) => {
  const dayOfWeek = currentDate.getDay();
  const startDate1 = new Date(currentDate.getFullYear(), 11, 25);
  const endDate1 = new Date(currentDate.getFullYear(), 11, 27);
  const startDate2 = new Date(currentDate.getFullYear(), 1, 1);
  const endDate2 = new Date(currentDate.getFullYear(), 1, 2);
  const currentHour = currentDate.getHours();
  if ((currentDate >= startDate1 && currentDate <= endDate1) || (currentDate >= startDate2 && currentDate <= endDate2)) {
    return false;
  }
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  if (dayOfWeek > 0 && dayOfWeek < 6 && (currentHour < 6 || currentHour > 16)) {
    return false;
  }
  return true;
}
