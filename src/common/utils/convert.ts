import BigNumber from "bignumber.js";

export const convertListingPrice = (value: string): string => {
  return BigNumber(value).div(Math.pow(10, 18)).toString();
};

export const convertWeiToEther = (value: string): number => {
  if (value === "0") return 0;
  return Number(BigNumber(value).div(Math.pow(10, 18)).toFixed(5));
};

export const convertWeiToEtherCustomDecimal = (value: string, decimal: number): number => {
  if (decimal === 18) return convertWeiToEther(value);
  return Number(BigNumber(value).div(Math.pow(10, decimal)).toFixed(5));
};

export const caculatorPriceListing = (
  amount0: string,
  amount1: string,
  decimal: number,
  deceimalLaunched: number,
  priceSymbol: number,
) => {
  if (amount1 === "0") {
    return {
      priceETH: "0",
      priceUSD: "0",
    };
  }
  const priceETH = BigNumber(amount0.toString())
    .div(amount1.toString())
    .multipliedBy(Math.pow(10, deceimalLaunched - decimal))
    .toFixed(9);
  const priceUSD = BigNumber(priceETH).multipliedBy(priceSymbol).toFixed(9);
  return {
    priceETH,
    priceUSD,
  };
};

export const caculatorInitLQ = (amoun: string, priceUSD: number) => {
  return convertWeiToEther(BigNumber(amoun).multipliedBy(priceUSD).toFixed(0));
};

export const caculatorFDV = (totalSupply: string, priceUSD: number, decimaLaunched: number) => {
  return convertWeiToEtherCustomDecimal(BigNumber(totalSupply).multipliedBy(priceUSD).toFixed(0), decimaLaunched);
};

export const caculatorRatioSupplyAdded = (amountAdded: string, totalSupply: string) => {
  if (totalSupply === "0") {
    return "0";
  }
  return BigNumber(amountAdded).div(totalSupply).multipliedBy(100).toFixed(0);
};

export const caculatorVolume = (amount: string, priceUSD: number) => {
  return convertWeiToEther(BigNumber(amount).multipliedBy(priceUSD).toFixed(0));
};

export const replaceEscaped = (val: string) => {
  return val.replace(">", "\\>").replace("=", "\\="); 
};
