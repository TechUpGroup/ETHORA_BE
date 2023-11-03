import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  HISTRIES_BLOCK_MODEL,
  HISTRIES_MODEL,
  Histories,
  HistoriesBlock,
  HistoriesBlockDocument,
  HistoriesDocument,
} from "./schema/history.schema";
import { PaginateModel } from "mongoose";
import { Network } from "common/enums/network.enum";


@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(HISTRIES_MODEL)
    private readonly histories: PaginateModel<HistoriesDocument>,
    @InjectModel(HISTRIES_BLOCK_MODEL)
    private readonly historiesBlock: PaginateModel<HistoriesBlockDocument>,
  ) {}

  // ----------------------------------------------------------------
  async findTransactionHashExists(hashes: string[]) {
    if (!hashes.length) return [];
    const txsHashes = hashes.map((hash) => hash.toLowerCase().trim());
    const result = await this.histories.find(
      { transaction_hash_index: { $in: txsHashes } },
      { transaction_hash_index: 1 },
    );
    return result.map((o) => o.transaction_hash_index as string);
  }

  saveHistories(items: Histories | Histories[]) {
    if (Array.isArray(items)) {
      return this.histories.insertMany(items);
    }
    return this.histories.create(items);
  }

    //-----------------------------------------------------------------
    async findTransactionHashBlockExists(hashes: string[], network: Network) {
      if (!hashes.length) return [];
      const txsHashes = hashes.map((hash) => hash.toLowerCase().trim());
      const result = await this.historiesBlock.find(
        { tx_hash_log_index: { $in: txsHashes }, network },
        { tx_hash_log_index: 1 },
      );
      return result.map((o) => o.tx_hash_log_index as string);
    }
  
    saveHistoriesBlock(items: HistoriesBlock | HistoriesBlock[]) {
      if (Array.isArray(items)) {
        return this.historiesBlock.insertMany(items);
      }
      return this.historiesBlock.create(items);
    }
}


