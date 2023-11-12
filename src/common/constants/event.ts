export const ROUTER_EVENT = {
  OPENTRADE: "OpenTrade",
  CANCELTRADE: "CancelTrade",
  FAILUNLOCK: "FailUnlock",
  FAILRESOLVE: "FailResolve",
};

export const REASON_FAIL = {
  "Router: Insufficient balance": "Insufficient balance",
  "Router: Slippage limit exceeds": "Invalid Slippage",
  "029": "Invalid liquidity" 
};

export const REASON_FAIL_NOT_CARE = [
  "Router: Trade has already been opened",
  "Router: Signature already used",
  "05"
];

export const REASON_FAIL_RETRY = [
  "Router: Wrong closing time",
  "Router: Wrong price",
  "O10"
];

export const ERROR_RETRY = {
  UNPREDICTABLE_GAS_LIMIT: "execution reverted",
  NONCE_EXPIRED: "nonce has already been used",
};

export const messageErr = "query returned more than 10000 results";
