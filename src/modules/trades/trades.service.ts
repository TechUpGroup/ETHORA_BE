import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { TRADES_MODEL, TradesDocument } from "./schemas/trades.schema";
import { CancelTradeDto, CreateTradeDto, GetTradesUserActiveDto, UpdateTradeDto } from "./dto/trades.dto";
import { TRADE_STATE } from "common/enums/trades.enum";
import { Timeout } from "@nestjs/schedule";
import { tradesHistories } from "common/config/data-sample";

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

    // TODO: address remove for data test
    return await this.model.paginate(
      { state: TRADE_STATE.OPENED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getLimitOrdersUserTrades(address: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    // TODO: address remove for data test
    return await this.model.paginate(
      { state: TRADE_STATE.QUEUED },
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
      { state: TRADE_STATE.CANCELLED },
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
      { state: { $nin: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED, TRADE_STATE.CANCELLED] } },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  // TODO: remove
  @Timeout(1000)
  async insertDataTest() {
    console.log("Removing trades history...");
    await this.model.deleteMany({});
    await this.model.insertMany(tradesHistories);
    console.log("Done inserted trades history.");
  }
}
