import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  HISTRIES_MODEL,
  Histories,
  HistoriesDocument,
} from "./schema/history.schema";
import { PaginateModel } from "mongoose";


@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(HISTRIES_MODEL)
    private readonly histories: PaginateModel<HistoriesDocument>,
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
}
