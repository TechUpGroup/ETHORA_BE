import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { TRADES_MODEL, TradesDocument } from "./schemas/trades.schema";
import { CancelTradeDto, CreateTradeDto, GetTradesUserActiveDto, UpdateTradeDto } from "./dto/trades.dto";
import { TRADE_STATE } from "common/enums/trades.enum";

@Injectable()
export class TradesService {
  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly model: PaginateModel<TradesDocument>,
  ) {}

  async createTrade(address: string, data: CreateTradeDto) {
    return { address, data };
  }

  async updateTrade(address: string, data: UpdateTradeDto) {
    return { address, data };
  }

  async cancelTrade(address: string, data: CancelTradeDto) {
    return { address, data };
  }

  async getActiveUserTrades(address: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { address, state: TRADE_STATE.OPENED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getCancelledUserTrades(address: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { address, state: TRADE_STATE.CANCELLED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getHistoryUserTrades(address: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { address, state: { $in: [TRADE_STATE.CLOSED, TRADE_STATE.CANCELLED] } },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }
}
