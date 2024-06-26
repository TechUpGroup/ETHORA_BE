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
import { TRADE_DURATION, TRADE_EARLY_CLOSE_DURATION } from "common/constants/trades";
import { UsersService } from "modules/users/users.service";
import { NetworkAndPaginationAndSortDto } from "common/dto/network.dto";
import { JobTradeService } from "modules/_jobs/trades/job-trade.service";
import { EthersService } from "modules/_shared/services/ethers.service";
import config from "common/config";
import { PairContractName, PairContractType, PairForex } from "common/constants/contract";
import { calcLockedAmount, checkDateTrade } from "common/utils/trades";
import { SETTLEMENT_FEE } from "common/constants/fee";
import { decryptAES } from "common/utils/encrypt";
import BigNumber from "bignumber.js";
import { BtcusdBinaryOptions__factory } from "common/abis/types";
import { UsersDocument } from "modules/users/schemas/users.schema";
// import { generateSignHashType } from "common/utils/ethers";
// import { Timeout } from "@nestjs/schedule";
// import { tradesHistories } from "common/config/data-sample";

@Injectable()
export class TradesService {
  constructor(
    @InjectModel(TRADES_MODEL)
    private readonly model: PaginateModel<TradesDocument>,
    private readonly userService: UsersService,
    private readonly jobTradeService: JobTradeService,
    private readonly ethersService: EthersService,
  ) {}

  async createTrade(user: UsersDocument, data: CreateTradeDto) {
    const { isLimitOrder, pair, period, targetContract, allowPartialFill, tradeSize, isAbove, slippage } = data;
    const userAddress = user.address;
    const now = new Date();

    if (Object.keys(PairForex).includes(pair.replace(/[^a-zA-Z]/, "").toUpperCase())) {
      const date = isLimitOrder ? new Date(data.limitOrderDuration * 1000 + now.getTime()) : now;
      if(!checkDateTrade(date)) {
        throw new BadRequestException("Invalid timming");
      }
    }

    if (slippage < 1) {
      throw new BadRequestException("Slippage is invalid");
    }

    // init instance contract
    const pairContractName = pair.replace(/[^a-zA-Z]/, "").toUpperCase() as PairContractName;
    const contractInfo = config.getPairContract(data.network, pairContractName, PairContractType.BINARY_OPTION);
    const contract = this.ethersService.getContract(
      data.network,
      contractInfo.address,
      BtcusdBinaryOptions__factory.abi,
    );

    const [wallet, lastTrade, totalTrade, lockedAmount] = await Promise.all([
      this.userService.findWalletByNetworkAndId(data.network, user._id),
      this.model.find({ userAddress, isAbove }).sort({ queuedDate: -1 }).limit(1),
      this.getTotalTradeOfPool(targetContract),
      calcLockedAmount(contract, userAddress, data),
    ]);

    const maxOI = this.jobTradeService.currentMaxOI[pairContractName];
    if (lastTrade.length && new Date(lastTrade[0].queuedDate.getTime() + 1000) > now) {
      throw new BadRequestException("Call too quickly");
    }

    if (
      maxOI &&
      (BigNumber(totalTrade).gte(maxOI) || (!allowPartialFill && BigNumber(totalTrade).plus(tradeSize).gte(maxOI)))
    ) {
      throw new BadRequestException("Invalid liquidity");
    }

    if (!wallet.isApproved) {
      throw new BadRequestException("Not approve");
    }

    if (BigNumber(tradeSize).gt("1000000000")) {
      throw new BadRequestException("Trade size over 1000 USDC");
    }

    if (period < 180 || period > 14400) {
      throw new BadRequestException("Time period invalid");
    }

    // TODO: validate
    if (isLimitOrder && (data.limitOrderDuration < 60 || data.limitOrderDuration > 86400)) {
      throw new BadRequestException("limitOrderDuration must >= 60 AND <= 86400.");
    }
    if (new Date(data.strikeDate.getTime() + TRADE_DURATION.BUFFER * 1000) < new Date()) {
      throw new BadRequestException("strikeDate too old");
    }

    const settlementFee = SETTLEMENT_FEE[pair.replace("-", "").toUpperCase()];

    const _data: TradesDocument | any = {
      ...data,
      userAddress,
      queueId: now.getTime(),
      queuedDate: now,
      limitOrderDuration: isLimitOrder ? data.limitOrderDuration : 0,
      limitOrderExpirationDate: isLimitOrder ? new Date(data.limitOrderDuration * 1000 + now.getTime()) : now,
      state: TRADE_STATE.QUEUED,
      settlementFee,
      lockedAmount,
      payout: lockedAmount,
      strikeOld: data.strike
    };

    // save
    const result = await this.model.create(_data);

    result["_doc"]["oneCT"] = wallet.address;
    result["_doc"]["privateKeyOneCT"] = decryptAES(wallet.privateKey);

    if (!isLimitOrder) {
      this.jobTradeService.queuesMarket.push(result["_doc"]);
    } else {
      this.jobTradeService.queuesLimitOrder.push(result["_doc"]);
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
    if (!trade.isLimitOrder) {
      throw new NotFoundException("Trade not isLimitOrder");
    }
    if (trade.state !== TRADE_STATE.QUEUED) {
      throw new NotFoundException("Trade not in QUEUED");
    }

    const now = new Date();
    const index = this.jobTradeService.queuesLimitOrder.findIndex((order) => order.queueId === trade.queueId);
    if(index === -1 ) {
      throw new NotFoundException("Trade not in QUEUED");
    }
    this.jobTradeService.queuesLimitOrder[index] = {
      ...(this.jobTradeService.queuesLimitOrder[index] as any),
      ...data,
      strikeOld: data.strike,
      limitOrderExpirationDate: new Date(data.limitOrderDuration * 1000 + now.getTime()),
    };

    const result = await this.model.findOneAndUpdate(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          ...data,
          strikeOld: data.strike,
          limitOrderExpirationDate: new Date(data.limitOrderDuration * 1000 + now.getTime()),
        },
      },
      {
        new: true,
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

    // TODO:
    const now = (Math.floor(new Date().getTime() / 1000) + 1).toString();

    let isTradeActive = false;
    this.jobTradeService.listActives.forEach((a, i) => {
      if (a.queueId === trade.queueId) {
        isTradeActive = true;
        this.jobTradeService.listActives.splice(i, 1);
        this.jobTradeService.queueCloseAnytime.push({
          ...a,
          closingTime: now,
        } as any);
      }
    });
    if (!isTradeActive) {
      throw new BadRequestException("Trade is in QUEUE");
    }

    const result = await this.model.findOneAndUpdate(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          closingTime: now,
          userCloseDate: new Date(+now * 1000),
        },
      },
      {
        new: true,
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
    if (trade.state !== TRADE_STATE.QUEUED) {
      throw new BadRequestException("Trade not in QUEUE state");
    }
    let isInQueue = false;
    this.jobTradeService.queuesLimitOrder.forEach((a, i) => {
      isInQueue = true;
      if (a.queueId === trade.queueId) {
        this.jobTradeService.queuesLimitOrder.splice(i, 1);
      }
    });
    if (!isInQueue) {
      throw new BadRequestException("Trade is OPENED");
    }

    const result = await this.model.findOneAndUpdate(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          state: TRADE_STATE.CANCELLED,
          isCancelled: true,
          cancellationDate: new Date(),
          cancellationReason: "Cancelled by user",
        },
      },
      {
        new: true,
      },
    );

    return result;
  }

  async getAllActiveTrades(query: NetworkAndPaginationAndSortDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { state: TRADE_STATE.OPENED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getAllHistoryTrades(query: NetworkAndPaginationAndSortDto) {
    const { page, limit, sortBy = "updatedAt", sortType = -1 } = query;

    return await this.model.paginate(
      { state: TRADE_STATE.CLOSED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  getAllTradesByOptionIdsAndTargetContract(contractOptionIds: string[]) {
    return this.model.find(
      { contractOption: { $in: contractOptionIds } },
      {
        targetContract: 1,
        optionId: 1,
        tradeSize: 1,
      },
    );
  }

  async getActiveUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    if (!userAddress) {
      throw new BadRequestException("userAddress is missing");
    }

    return await this.model.paginate(
      {
        userAddress,
        $or: [
          { state: { $in: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED] }, isLimitOrder: false },
          { state: TRADE_STATE.OPENED, isLimitOrder: true },
        ],
      },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getLimitOrdersUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    if (!userAddress) {
      throw new BadRequestException("userAddress is missing");
    }

    return await this.model.paginate(
      { userAddress, state: TRADE_STATE.QUEUED, isLimitOrder: true },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getCancelledUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "updatedAt", sortType = -1 } = query;

    if (!userAddress) {
      throw new BadRequestException("userAddress is missing");
    }

    return await this.model.paginate(
      { userAddress, state: TRADE_STATE.CANCELLED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  getAllTradesClosed(optionIds: number[]) {
    return this.model.aggregate([
      {
        $match: {
          contractOption: { $in: optionIds },
          call_close: { $lte: config.maximumRetry },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
  }

  async getHistoryUserTrades(userAddress: string, query: GetTradesUserActiveDto) {
    const { page, limit, sortBy = "updatedAt", sortType = -1 } = query;

    if (!userAddress) {
      throw new BadRequestException("userAddress is missing");
    }

    return await this.model.paginate(
      { userAddress, state: TRADE_STATE.CLOSED },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getTotalTradeOfPool(targetContract: string) {
    const res = await this.model.aggregate([
      {
        $match: {
          targetContract,
          state: TRADE_STATE.OPENED,
        },
      },
      {
        $project: {
          tradeSize: { $toDouble: "$tradeSize" },
        },
      },
      {
        $group: {
          _id: null,
          totalTrade: { $sum: "$tradeSize" },
        },
      },
    ]);
    if (!res.length) {
      return 0;
    }
    return res[0].totalTrade;
  }

  async bulkWrite(bw: any[]) {
    await this.model.bulkWrite(bw);
  }

  findTradeByState(state: TRADE_STATE) {
    return this.model.find({
      state,
    });
  }

  // TODO: remove
  // @Timeout(1000)
  // async insertDataTest() {
  //   console.log("Removing trades history...");
  //   await this.model.deleteMany({});
  //   await this.model.insertMany(tradesHistories);
  //   console.log("Done inserted trades history.");
  // }

  async loadActiveTrades() {
    let trades = await this.model.aggregate([
      {
        $match: {
          state: TRADE_STATE.OPENED,
          call_close: { $lt: config.maximumRetry }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (trades.length) {
      console.log("[ActiveTrade] Loaded", trades.length, "activeTrade to listActives");
      trades = trades
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.jobTradeService.listActives.push(...trades);
    }
  }

  async loadTradesMarket() {
    let trades = await this.model.aggregate([
      {
        $match: {
          state: TRADE_STATE.QUEUED,
          isLimitOrder: false,
          call_open: { $lt: config.maximumRetry }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (trades.length) {
      console.log("[TradeMarket] Loaded", trades.length, "tradesMarket to queues");
      trades = trades
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.jobTradeService.queuesMarket.push(...trades);
    }
  }

  async loadTradesLimitOrder() {
    let trades = await this.model.aggregate([
      {
        $match: {
          state: TRADE_STATE.QUEUED,
          isLimitOrder: true,
          call_open: { $lt: config.maximumRetry }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (trades.length) {
      console.log("[TradeLimit] Loaded", trades.length, "tradesLimit to queues");
      trades = trades
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.jobTradeService.queuesLimitOrder.push(...trades);
    }
  }

  closeUnsuccess() {
    return this.model.aggregate([
      {
        $match: {
          state: TRADE_STATE.CLOSED,
          tx_close: null,
          optionId: { $ne: null},
          call_close: { $gt: config.maximumRetry}
        },
      },
    ]);
  }

  async retryTX(queueIds: number[]) {
    let tradeCloseUnsuccess = await this.model.aggregate([
      {
        $match: {
          state: TRADE_STATE.CLOSED,
          tx_close: null,
          optionId: { $ne: null},
          queueId: { $in: queueIds },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userAddress",
          foreignField: "address",
          as: "user",
          pipeline: [
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    if (tradeCloseUnsuccess.length) {
      console.log("[ActiveTrade] Loaded", tradeCloseUnsuccess.length, "activeTrade to listActives");
      tradeCloseUnsuccess = tradeCloseUnsuccess
        .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
        .map((trade) => {
          return {
            ...trade,
            oneCT: trade.user.oneCT,
            privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
          };
        });
      this.jobTradeService.listActives.push(...tradeCloseUnsuccess);
    }
    return;
  }

  getIVConfig() {
    return this.jobTradeService.currentIV;
  }
}
