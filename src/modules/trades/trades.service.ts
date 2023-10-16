import { PaginateModel } from "mongoose";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
    const { isLimitOrder } = data;
    // TODO: validate
    if (isLimitOrder && (data.limitOrderDuration < 60 || data.limitOrderDuration > 86400)) {
      throw new BadRequestException("limitOrderDuration must >= 60 AND <= 86400.");
    }

    const now = new Date();
    const _data: TradesDocument | any = {
      ...data,
      userAddress,
      queueId: now.getTime(),
      queuedDate: now,
      limitOrderExpirationDate: new Date(data.limitOrderDuration * 1000 + now.getTime()),
      state: isLimitOrder ? TRADE_STATE.QUEUED : TRADE_STATE.OPENED,
      settlementFee: 500,
    };
    const result = await this.model.create(_data);

    // return
    return result;
  }

  async updateTrade(userAddress: string, data: UpdateTradeDto) {
    // validate
    const trade = await this.model.findById(data._id);
    if (!trade) {
      throw new NotFoundException("Trade not found");
    }

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
    const trade = await this.model.findById(data._id);
    if (!trade) {
      throw new NotFoundException("Trade not found");
    }

    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          userCloseDate: new Date(),
          state: TRADE_STATE.CLOSED,
        },
      },
    );

    return result;
  }

  async cancelTrade(userAddress: string, data: CancelTradeDto) {
    // validate
    const trade = await this.model.findById(data._id);
    if (!trade) {
      throw new NotFoundException("Trade not found");
    }

    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          state: TRADE_STATE.CANCELLED,
          cancellationDate: new Date(),
          cancellationReason: "User cancelled",
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
