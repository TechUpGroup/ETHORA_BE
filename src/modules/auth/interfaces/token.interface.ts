import { TokenTypes } from "../constants/token.constant";

export interface ICreateToken {
  user: string;
  type: TokenTypes;
}

export interface IVerifySignature {
  signature: string;
  message: string;
  address: string;
}
