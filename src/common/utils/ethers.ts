import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { getAddress } from "@ethersproject/address";
import { arrayify } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import { keccak256 as keccak256Base } from "@ethersproject/keccak256";
import { Web3Provider } from "@ethersproject/providers";
import { pack } from "@ethersproject/solidity";
import { toUtf8Bytes } from "@ethersproject/strings";
import { Wallet } from "@ethersproject/wallet";

import type { Signer } from "@ethersproject/abstract-signer";
import type { Provider } from "@ethersproject/providers";

export const getLibrary = (provider: any) => {
  return new Web3Provider(provider);
};

// returns the checksummed address if the address is valid, otherwise returns false
function isAddress(value: any) {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}

export function generateNewWallet(mnemonic: string, path?: string) {
  return Wallet.fromMnemonic(mnemonic, path);
}

export function getWallet(privateKey: string, provider: Provider) {
  return new Wallet(privateKey, provider);
}

export function getContract<T extends Contract = Contract>(address: string, ABI: any, signer: Provider | Signer) {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return new Contract(address, ABI, signer) as T;
}

export const signMessage = async (signer: Signer, message: string): Promise<string> => {
  return signer.signMessage(message);
};

export const keccak256 = (message: string) => keccak256Base(toUtf8Bytes(message));

export const encodeParameters = (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>) => {
  return defaultAbiCoder.encode(types, values);
};

export const encodePacked = (types: string[], values: any[]) => {
  return pack(types, values);
};

export const generateParamsSign = (params: string[], values: any[]) => {
  const encodedMessage = encodeParameters(params, values);
  const hashMessage = keccak256Base(encodedMessage);
  return arrayify(hashMessage);
};

export const generatePackedSign = (params: string[], values: any[]) => {
  const encodedMessage = encodePacked(params, values);
  const hashMessage = keccak256Base(encodedMessage);
  return arrayify(hashMessage);
};

export const generateNonce = (address: string) => {
  const now = new Date().getTime();
  return keccak256(address.slice(2) + now.toString());
};

export const generateRandomString = (length: number) => {
  const availableChars = "0123456789012345678901234567890123456789012345678901234567890123456789";
  let randomString = "";
  for (let i = 0; i < length; i++) {
    randomString += availableChars[Math.floor(Math.random() * availableChars.length)];
  }
  return randomString;
};

export const generateRandom = () => {
  const randomCode = generateRandomString(75);
  return Math.floor(Math.random() * 10).toFixed() + randomCode;
};
