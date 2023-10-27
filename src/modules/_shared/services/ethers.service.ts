import config from "common/config";
import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { SignerType } from "common/enums/signer.enum";
import { generateNewWallet, getContract, getWallet } from "common/utils/ethers";
import configPrivate from "config";

import { Bytes } from "@ethersproject/bytes";
import { Contract } from "@ethersproject/contracts";
import { JsonRpcBatchProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { formatDecimal } from "common/utils/mongoose";
import type { Provider } from "@ethersproject/providers";
import type { Signer } from "@ethersproject/abstract-signer";
import { DOMAIN } from "common/utils/signature";

interface EtherProvider {
  provider: JsonRpcBatchProvider;
  signers: Map<SignerType, Wallet>;
}

@Injectable()
export class EthersService {
  private readonly ethersMap: Map<Network, EtherProvider>;
  private readonly currentBlockNumber: Map<Network, number>;
  private readonly currentGas: Map<Network, string>;

  constructor() {
    this.ethersMap = new Map<Network, EtherProvider>();
    this.currentBlockNumber = new Map<Network, number>();
    this.currentGas = new Map<Network, string>();
    for (const network of allNetworks) {
      const provider = new JsonRpcBatchProvider(config.getEthereumProvider(network));

      const signerTypes = new Map<SignerType, Wallet>();
      const prkOperator = configPrivate.get<string>(`blockchain.private_key.operator`);
      const prkSfPublisher = configPrivate.get<string>(`blockchain.private_key.sfPublisher`);
      const prkPublisher = configPrivate.get<string>(`blockchain.private_key.publisher`);
      if (prkOperator) signerTypes.set(SignerType.operator, getWallet(prkOperator, provider));
      if (prkSfPublisher) signerTypes.set(SignerType.sfPublisher, getWallet(prkSfPublisher, provider));
      if (prkPublisher) signerTypes.set(SignerType.publisher, getWallet(prkPublisher, provider));

      this.ethersMap.set(network, { provider, signers: signerTypes });
    }
    this.getCurrentBlockNumber();
    this.syncCurrentGas();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getCurrentBlockNumber() {
    await Promise.all(
      allNetworks.map(async (network) => {
        try {
          const blockNumber = await this.getLastBlockNumber(network);
          this.currentBlockNumber.set(network, blockNumber);
        } catch {
          const provider = new JsonRpcBatchProvider(config.listRPC(network)[Math.floor(Math.random() * 4)]);
          const signerTypes = new Map<SignerType, Wallet>();
          const prkOperator = configPrivate.get<string>(`blockchain.private_key.operator`);
          const prkSfPublisher = configPrivate.get<string>(`blockchain.private_key.sfPublisher`);
          const prkPublisher = configPrivate.get<string>(`blockchain.private_key.publisher`);
          if (prkOperator) signerTypes.set(SignerType.operator, getWallet(prkOperator, provider));
          if (prkSfPublisher) signerTypes.set(SignerType.sfPublisher, getWallet(prkSfPublisher, provider));
          if (prkPublisher) signerTypes.set(SignerType.publisher, getWallet(prkPublisher, provider));

          this.ethersMap.set(network, { provider, signers: signerTypes });
        }
      }),
    );
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncCurrentGas() {
    await Promise.all(
      allNetworks.map(async (network) => {
        try {
          const gasPrice = await this.getGasPrice(network);
          this.currentGas.set(network, (formatDecimal(gasPrice) * 1.2).toFixed(0));
        } catch {
          const provider = new JsonRpcBatchProvider(config.listRPC(network)[Math.floor(Math.random() * 4)]);
          const signerTypes = new Map<SignerType, Wallet>();
          const prkOperator = configPrivate.get<string>(`blockchain.private_key.operator`);
          const prkSfPublisher = configPrivate.get<string>(`blockchain.private_key.sfPublisher`);
          const prkPublisher = configPrivate.get<string>(`blockchain.private_key.publisher`);
          if (prkOperator) signerTypes.set(SignerType.operator, getWallet(prkOperator, provider));
          if (prkSfPublisher) signerTypes.set(SignerType.sfPublisher, getWallet(prkSfPublisher, provider));
          if (prkPublisher) signerTypes.set(SignerType.publisher, getWallet(prkPublisher, provider));

          this.ethersMap.set(network, { provider, signers: signerTypes });
        }
      }),
    );
  }

  getCurrentGas(network: Network) {
    return this.currentGas.get(network) || "0";
  }

  getBlockNumber(network: Network) {
    return this.currentBlockNumber.get(network) || 0;
  }

  getNetwork(network: Network) {
    const networkInfo = this.ethersMap.get(network);
    if (!networkInfo) throw new Error(`${network} is not set`);
    return networkInfo;
  }

  getWallet(privateKey: string, network: Network) {
    const provider = this.getProvider(network);
    return getWallet(privateKey, provider);
  }

  getProvider(network: Network) {
    return this.getNetwork(network).provider;
  }

  private getSigner(network: Network, type: SignerType) {
    const signers = this.getNetwork(network).signers;
    const signer = signers.get(type);
    if (!signer) {
      throw new Error(`signer ${network} ${type} is not set`);
    }
    return signer;
  }

  signMessage(network: Network, type: SignerType, message: Bytes | string) {
    const signer = this.getSigner(network, type);
    return signer.signMessage(message);
  }

  signTypeData(network: Network, type: SignerType, verifyingContract: string, types: any, values: any) {
    const signer = this.getSigner(network, type);
    const domain = {
      ...DOMAIN,
      chainId: network,
      verifyingContract: "0xbb2401ff6f6dbef3b3cd1db80ab2972b390540cf"
    }
    return signer._signTypedData(domain, types, values);
  }

  signTypeDataWithSinger(network: Network, signer: Wallet, verifyingContract: string, types: any, values: any) {
    const domain = {
      ...DOMAIN,
      chainId: network,
      verifyingContract: "0xbb2401ff6f6dbef3b3cd1db80ab2972b390540cf"
    }
    return signer._signTypedData(domain, types, values);
  }

  getContract<T extends Contract = Contract>(network: Network, address: string, ABI: any, type?: SignerType) {
    const provider = type ? this.getSigner(network, type) : this.getProvider(network);
    return getContract<T>(address, ABI, provider);
  }

  getContractWithProvider<T extends Contract = Contract>(network: Network, address: string, ABI: any, provider: Provider | Signer ) {
    return getContract<T>(address, ABI, provider);
  }

  getLastBlockNumber(network: Network) {
    return this.getProvider(network).getBlockNumber();
  }

  getBalance(address: string, network: Network) {
    return this.getProvider(network).getBalance(address);
  }

  getGasPrice(network: Network) {
    return this.getProvider(network).getGasPrice();
  }

  async getBlockTime(network: Network, blockNumber: number) {
    try {
      const block = await this.getProvider(network).getBlock(blockNumber);
      return Number(block.timestamp);
    } catch (e) {
      console.log("ERROR_BLOCK_TIME ` : ", e);
      return 0;
    }
  }

  generateNewWallet(mnemonic: string, path?: string) {
    return generateNewWallet(mnemonic, path);
  }
}
