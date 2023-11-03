export enum TOPIC {
  // ERC721
  TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  OwnershipTransferred = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
  EXERCISE = "0xf394088c7503260c927488ca4397d6b43146f13c239078415e6f14029e5cb7f8",
  EXPIRE = "0x06b9a7d5e559ec958118dcc25fab116916793fa9782acbf47186bf70bc4cf88e"
}

export const TOKEN = {
  eth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  base: "0x4200000000000000000000000000000000000006",
  bsc: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
};

export const SYMBOL_STABLE = {
  eth: "WETH",
  base: "WETH",
  bsc: "WBNB",
};

export const SYMBOL_NETWORK = {
  eth: "ETH",
  base: "ETH",
  bsc: "BNB",
};

export const DECIMAL_TOKEN = {
  USDT: 18,
  USDC: 18,
  WETH: 18,
  WBNB: 18,
};
