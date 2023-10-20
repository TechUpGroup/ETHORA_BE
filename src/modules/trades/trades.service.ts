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
import { TRADE_EARLY_CLOSE_DURATION } from "common/constants/trades";
import { UsersService } from "modules/users/users.service";
// import { Timeout } from "@nestjs/schedule";
// import { tradesHistories } from "common/config/data-sample";

@Injectable()
export class TradesService {
  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly model: PaginateModel<TradesDocument>,
    private readonly userService: UsersService,
  ) {}

  async createTrade(userAddress: string, data: CreateTradeDto) {
    const { isLimitOrder } = data;

    const user = await this.userService.getUserByAddress(userAddress);

    // TODO: validate
    if (isLimitOrder && (data.limitOrderDuration < 60 || data.limitOrderDuration > 86400)) {
      throw new BadRequestException("limitOrderDuration must >= 60 AND <= 86400.");
    }
    if (new Date(data.strikeDate.getTime() + data.period * 1000) < new Date()) {
      throw new BadRequestException("strikeDate too old");
    }

    const now = new Date();
    const _data: TradesDocument | any = {
      ...data,
      userAddress,
      queueId: now.getTime(),
      queuedDate: now,
      limitOrderExpirationDate: isLimitOrder ? new Date(data.limitOrderDuration * 1000 + now.getTime()) : now,
      state: isLimitOrder ? TRADE_STATE.QUEUED : TRADE_STATE.OPENED,
      openDate: isLimitOrder ? null : now,
      settlementFee: 500,
      referralCode: user.referralCode,
    };
    const result = await this.model.create(_data);

    // TODO: contract openTrade()
    if (!isLimitOrder) {
    }

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
    if (trade.state !== TRADE_STATE.OPENED) {
      throw new BadRequestException("Trade not in OPENED state");
    }
    if (!trade.openDate || new Date(trade.openDate.getTime() + TRADE_EARLY_CLOSE_DURATION * 1000) > new Date()) {
      throw new BadRequestException("Close trade too early");
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
          // TODO: update price
          expiryPrice: 0,
        },
      },
    );

    // TODO: contract closeTrade()

    return result;
  }

  async cancelTrade(userAddress: string, data: CancelTradeDto) {
    // validate
    const trade = await this.model.findById(data._id);
    if (!trade) {
      throw new NotFoundException("Trade not found");
    }
    if (trade.state !== TRADE_STATE.QUEUED) {
      throw new BadRequestException("Trade not in QUEUE state");
    }

    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          state: TRADE_STATE.CANCELLED,
          isCancelled: true,
          cancellationDate: new Date(),
          cancellationReason: "User cancelled",
        },
      },
    );

    return result;
  }

  async getActiveUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { userAddress, state: { $in: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED] }, isLimitOrder: false },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getActivesUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { userAddress, state: { $in: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED] } },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getLimitOrdersUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { userAddress, state: { $in: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED] }, isLimitOrder: true },
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
      { userAddress, state: { $nin: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED, TRADE_STATE.CREATED] } },
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
