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
import { LogsService } from "modules/logs/logs.service";

interface EtherProvider {
  provider: JsonRpcBatchProvider;
  providerJob: JsonRpcBatchProvider;
  signers: Map<SignerType, Wallet>;
}

@Injectable()
export class EthersService {
  private readonly ethersMap: Map<Network, EtherProvider>;
  private readonly currentBlockNumber: Map<Network, number>;
  private readonly currentGas: Map<Network, string>;
  private readonly signerTypes: Map<SignerType, Wallet>;
  private chooseRPC = 0;
  private chooseRPCJob = 2;

  constructor(private readonly logsService: LogsService) {
    this.ethersMap = new Map<Network, EtherProvider>();
    this.currentBlockNumber = new Map<Network, number>();
    this.currentGas = new Map<Network, string>();
    this.signerTypes = new Map<SignerType, Wallet>();
    for (const network of allNetworks) {
      const provider = new JsonRpcBatchProvider(config.listRPC(network)[1]);
      const providerJob = new JsonRpcBatchProvider(config.listRPC(network)[2]);

      const prkOperator = configPrivate.get<string>(`blockchain.private_key.operator`);
      const prkSfPublisher = configPrivate.get<string>(`blockchain.private_key.sfPublisher`);
      const prkPublisher = configPrivate.get<string>(`blockchain.private_key.publisher`);
      if (prkOperator) this.signerTypes.set(SignerType.operator, getWallet(prkOperator, provider));
      if (prkSfPublisher) this.signerTypes.set(SignerType.sfPublisher, getWallet(prkSfPublisher, provider));
      if (prkPublisher) this.signerTypes.set(SignerType.publisher, getWallet(prkPublisher, provider));

      this.ethersMap.set(network, { provider, providerJob, signers: this.signerTypes });
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
          this.switchRPCOfJob(network);
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
          this.currentGas.set(network, (formatDecimal(gasPrice) * 2).toFixed(0));
        } catch {
          this.switchRPC(network);
        }
      }),
    );
  }

  switchRPCOfJob(network: Network) {
    this.chooseRPCJob = ((this.chooseRPCJob + 1) % 3) + 2;
    const provider = this.getProvider(network);
    const providerJob = new JsonRpcBatchProvider(config.listRPC(network)[this.chooseRPCJob]);
    this.ethersMap.set(network, { provider, providerJob, signers: this.signerTypes });
    this.logsService.createLog("chooseRPCJob", config.listRPC(network)[this.chooseRPC]);
  }

  switchRPC(network: Network) {
    this.chooseRPC = (this.chooseRPC + 1) % 2;
    const providerJob = this.getProvider(network);
    const provider = new JsonRpcBatchProvider(config.listRPC(network)[this.chooseRPC]);
    this.ethersMap.set(network, { provider, providerJob, signers: this.signerTypes });
    this.logsService.createLog("chooseRPC", config.listRPC(network)[this.chooseRPC]);
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

  getProvider(network: Network, isJob = false) {
    if (isJob) {
      return this.getNetwork(network).providerJob;
    }
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
      verifyingContract,
    };
    return signer._signTypedData(domain, types, values);
  }

  signTypeDataWithSinger(network: Network, signer: Wallet, verifyingContract: string, types: any, values: any) {
    const domain = {
      ...DOMAIN,
      chainId: network,
      verifyingContract,
    };
    return signer._signTypedData(domain, types, values);
  }

  getContract<T extends Contract = Contract>(network: Network, address: string, ABI: any, type?: SignerType) {
    const provider = type ? this.getSigner(network, type) : this.getProvider(network);
    return getContract<T>(address, ABI, provider);
  }

  getContractWithProvider<T extends Contract = Contract>(
    network: Network,
    address: string,
    ABI: any,
    provider: Provider | Signer,
  ) {
    return getContract<T>(address, ABI, provider);
  }

  getContractSyncEvent<T extends Contract = Contract>(network: Network, address: string, ABI: any) {
    const provider = this.getProvider(network, true);
    return getContract<T>(address, ABI, provider);
  }

  getLastBlockNumber(network: Network) {
    return this.getProvider(network, true).getBlockNumber();
  }

  getBalance(address: string, network: Network) {
    return this.getProvider(network).getBalance(address);
  }

  getGasPrice(network: Network) {
    return this.getProvider(network).getGasPrice();
  }

  async getBlockTime(network: Network, blockNumber: number) {
    try {
      const block = await this.getProvider(network, true).getBlock(blockNumber);
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
