import { generateParamsSign } from "./ethers";

export const DOMAIN_TYPE = [
  {
    type: "string",
    name: "name",
  },
  {
    type: "string",
    name: "version",
  },
  {
    type: "uint256",
    name: "chainId",
  },
  {
    type: "address",
    name: "verifyingContract",
  },
];

export const SettlementFeeSignature = {
  SettlementFeeSignature: [
    {
      type: "string",
      name: "assetPair",
    },
    {
      type: "uint256",
      name: "expiryTimestamp",
    },
    {
      type: "uint256",
      name: "settlementFee",
    },
  ],
};

export const UserTradeSignature = {
  UserTradeSignature: [
    {
      type: "address",
      name: "user",
    },
    {
      type: "uint256",
      name: "totalFee",
    },
    {
      type: "uint256",
      name: "period",
    },
    {
      type: "address",
      name: "targetContract",
    },
    {
      type: "uint256",
      name: "strike",
    },
    {
      type: "uint256",
      name: "slippage",
    },
    {
      type: "bool",
      name: "allowPartialFill",
    },
    {
      type: "string",
      name: "referralCode",
    },
    {
      type: "uint256",
      name: "timestamp",
    },
  ],
};
export const UserTradeSignatureWithSettlementFee = {
  UserTradeSignatureWithSettlementFee: [
    {
      type: "address",
      name: "user",
    },
    {
      type: "uint256",
      name: "totalFee",
    },
    {
      type: "uint256",
      name: "period",
    },
    {
      type: "address",
      name: "targetContract",
    },
    {
      type: "uint256",
      name: "strike",
    },
    {
      type: "uint256",
      name: "slippage",
    },
    {
      type: "bool",
      name: "allowPartialFill",
    },
    {
      type: "string",
      name: "referralCode",
    },
    {
      type: "uint256",
      name: "timestamp",
    },
    {
      type: "uint256",
      name: "settlementFee",
    },
  ],
};

export const DOMAIN = {
  name: "Validator",
  version: "1",
  chainId: "",
  verifyingContract: "",
};

export function createTypeData(types: any, chainId: number, verifyingContract: string, primaryType: string, data: any) {
  return {
    types: {
      EIP712Domain: DOMAIN_TYPE,
      types,
    },
    domain: {
      ...DOMAIN,
      chainId,
      verifyingContract,
    },
    primaryType: primaryType,
    message: data,
  };
}

export function generateMessage(assetPair: string, timestamp: string, price: number) {
  return generateParamsSign(["string", "uint256", "uint256"], [assetPair, timestamp, price]);
}
