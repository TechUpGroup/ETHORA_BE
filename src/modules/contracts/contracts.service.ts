import config from "common/config";
import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { Contracts, CONTRACTS_MODEL, ContractsDocument } from "./schemas/contracts.schema";
import { EthersService } from "modules/_shared/services/ethers.service";
import { ContractName } from "common/constants/contract";

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(CONTRACTS_MODEL)
    private readonly contractModel: PaginateModel<ContractsDocument>,
    private readonly ethersService: EthersService,
  ) {
    void this.initContract();
  }

  async createContract(doc: Contracts) {
    return await this.contractModel.create(doc);
  }

  async updateBlocknumberSynced(_id: string, blocknumber_synced: number) {
    return await this.contractModel.findOneAndUpdate({ _id }, { blocknumber_synced }, { new: true });
  }

  async checkContractExist(name: ContractName, network: Network) {
    return !!(await this.contractModel.findOne({ name, network }));
  }

  async getContractByNames(name: ContractName, network?: Network) {
    const query: any = { name };
    if (network) {
      query.network = network;
    }
    return await this.contractModel.find(query);
  }

  async getContractByName(name: ContractName, network?: Network) {
    const query: any = { name };
    if (network) {
      query.network = network;
    }
    return await this.contractModel.findOne(query);
  }

  getListContract(network?: Network) {
    const query: any = {};
    if (network) {
      query.network = network;
    }
    return this.contractModel.find(query, {
      _id: 0,
      contract_address: 1,
      name: 1,
      network: 1,
    });
  }

  async initContract() {
    try {
      const contractCreate: {
        contract_address: string;
        blocknumber_synced: number;
        name: ContractName;
        network: Network;
      }[] = [];

      for (const network of allNetworks) {
        for (const name of Object.values(ContractName)) {
          const { address } = config.getContract(network, name);
          const blocknumber = await this.ethersService.getLastBlockNumber(network);
          contractCreate.push({
            contract_address: address,
            blocknumber_synced: blocknumber,
            name,
            network
          });
        }
      }

      for (const contract of contractCreate) {
        const { contract_address, name, network } = contract;
        if (!contract_address) continue;
        if (!(await this.checkContractExist(name, network))) {
          await this.createContract(contract);
        }
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
