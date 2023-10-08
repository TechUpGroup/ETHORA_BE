import { allNetworks } from "common/constants/network";
import { Network } from "common/enums/network.enum";
import { EthersService } from "modules/_shared/services/ethers.service";
import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { Blocks, BLOCKS_MODEL, BlocksDocument } from "./schemas/blocks.schema";

@Injectable()
export class BlocksService {
  constructor(
    @InjectModel(BLOCKS_MODEL)
    private readonly blocksModel: PaginateModel<BlocksDocument>,
    private readonly etherSerivce: EthersService,
  ) {
    void this.initBlocks();
  }

  async create(doc: Blocks) {
    return await this.blocksModel.create(doc);
  }

  async updateBlocknumberSynced(_id: string, blocknumber_synced: number) {
    return await this.blocksModel.findOneAndUpdate({ _id }, { blocknumber_synced }, { new: true });
  }

  async checkBlocksExist(network: Network) {
    return !!(await this.blocksModel.findOne({ network }));
  }

  getAll(network?: Network) {
    const query: any = {};
    if (network) {
      query.network = network;
    }
    return this.blocksModel.find(query);
  }

  getBlockByNetwork(network: Network) {
    return this.blocksModel.findOne({ network });
  }

  async initBlocks() {
    try {
      for (const network of allNetworks) {
        if (!(await this.checkBlocksExist(network))) {
          const blocknumber = await this.etherSerivce.getLastBlockNumber(network) - 50;
          await this.create({ blocknumber_synced: blocknumber, network });
        }
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
