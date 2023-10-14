import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { TRADES_MODEL, TradesDocument } from "./schemas/trades.schema";
import {
  CancelTradeDto,
  CloseTradeDto,
  CreateTradeDto,
  GetTradesUserActiveDto,
  UpdateTradeDto,
} from "./dto/trades.dto";
import { TRADE_STATE } from "common/enums/trades.enum";
// import { Timeout } from "@nestjs/schedule";
// import { tradesHistories } from "common/config/data-sample";

@Injectable()
export class TradesService {
  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly model: PaginateModel<TradesDocument>,
  ) {}

  async createTrade(userAddress: string, data: CreateTradeDto) {
    // TODO: validate
    const result = await this.model.create({ ...data, userAddress });

    // return
    return result;
  }

  async updateTrade(userAddress: string, data: UpdateTradeDto) {
    // validate

    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          ...data,
        },
      },
    );

    return result;
  }

  async closeTrade(userAddress: string, data: CloseTradeDto) {
    // validate

    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          userCloseDate: new Date(),
          state: TRADE_STATE.CANCELLED,
        },
      },
    );

    return result;
  }

  async cancelTrade(userAddress: string, data: CancelTradeDto) {
    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          userCloseDate: new Date(),
          state: TRADE_STATE.CANCELLED,
        },
      },
    );

    return result;
  }

  async getActiveUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    // TODO: address remove for data test
    return await this.model.paginate(
      { userAddress, state: TRADE_STATE.OPENED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getLimitOrdersUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    // TODO: address remove for data test
    return await this.model.paginate(
      { userAddress, state: TRADE_STATE.QUEUED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getCancelledUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { userAddress, state: TRADE_STATE.CANCELLED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getHistoryUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { userAddress, state: { $nin: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED, TRADE_STATE.CANCELLED] } },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  // TODO: remove
  // @Timeout(1000)
  // async insertDataTest() {
  //   console.log("Removing trades history...");
  //   await this.model.deleteMany({});
  //   await this.model.insertMany(tradesHistories);
  //   console.log("Done inserted trades history.");
  // }
}
