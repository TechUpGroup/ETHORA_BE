export const ROUTER_EVENT = {
  OPENTRADE: "OpenTrade",
  CANCELTRADE: "CancelTrade",
  FAILUNLOCK: "FailUnlock",
  FAILRESOLVE: "FailResolve",
};

export const REASON_FAIL = {
  "Router: Insufficient balance": "Insufficient balance",
  "Router: Incorrect allowance": "Not approve",
  "ERC20Permit: expired deadline": "Order has already expired",
  "Router: Limit order has already expired": "Order has already expired",
  "Router: Slippage limit exceeds": "Slippage limit exceeds",
  "Router: Early close is not allowed": " Early close is not allowed",
  "Router: Wrong closing time": "Wrong closing time",
  "Router: Wrong price": "Wrong price",
  O10: "Error",
  O5: "Error",
  "Pool: lockedAmount is already unlocked": "lockedAmount is already unlocked",
};

export const REASON_FAIL_RETRY = {
  "Router: Wrong closing time": "Wrong closing time",
  "Router: Wrong price": "Wrong price",
  O10: "Error",
};

export const ERROR_RETRY = {
  UNPREDICTABLE_GAS_LIMIT: "UNPREDICTABLE_GAS_LIMIT",
  NONCE_EXPIRED: "NONCE_EXPIRED",
};

export const messageErr = "query returned more than 10000 results";
