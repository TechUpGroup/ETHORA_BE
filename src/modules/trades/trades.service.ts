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
import { PairContractName, PairContractType } from "common/constants/contract";
import { PAIR_CONTRACT_ABIS } from "common/constants/abis";
import { calcLockedAmount } from "common/utils/trades";
import { SETTLEMENT_FEE } from "common/constants/fee";
import { decryptAES } from "common/utils/encrypt";
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

  async createTrade(userAddress: string, data: CreateTradeDto) {
    const { isLimitOrder, pair } = data;

    const user = await this.userService.getUserByAddress(userAddress);
    const wallet = await this.userService.findWalletByNetworkAndId(data.network, user._id);

    if (!wallet.isApproved) {
      // TODO: merge approve and first trade
    }

    // TODO: validate
    if (isLimitOrder && (data.limitOrderDuration < 60 || data.limitOrderDuration > 86400)) {
      throw new BadRequestException("limitOrderDuration must >= 60 AND <= 86400.");
    }
    if (new Date(data.strikeDate.getTime() + TRADE_DURATION.BUFFER * 1000) < new Date()) {
      throw new BadRequestException("strikeDate too old");
    }

    const now = new Date();
    const settlementFee = SETTLEMENT_FEE[pair.replace("-", "").toUpperCase()];

    const _data: TradesDocument | any = {
      ...data,
      userAddress,
      queueId: now.getTime(),
      queuedDate: now,
      limitOrderDuration: isLimitOrder ? data.limitOrderDuration : 0,
      limitOrderExpirationDate: isLimitOrder ? new Date(data.limitOrderDuration * 1000 + now.getTime()) : now,
      state: TRADE_STATE.QUEUED,
      slippage: 5,
      // openDate: now,
      settlementFee,
    };

    // calc lockedAmount
    if (!data.isLimitOrder) {
      const pairContractName = data.pair.replace(/[^a-zA-Z]/, "").toUpperCase() as PairContractName;
      const contractInfo = config.getPairContract(data.network, pairContractName, PairContractType.BINARY_OPTION);
      const contract = this.ethersService.getContract(
        data.network,
        contractInfo.address,
        PAIR_CONTRACT_ABIS[pairContractName]?.abi,
      );
      _data["lockedAmount"] = await calcLockedAmount(contract, userAddress, data);
    }

    // save
    const result = await this.model.create(_data);

    result['_doc']["oneCT"] = wallet.address;
    result['_doc']["privateKeyOneCT"] = decryptAES(wallet.privateKey);

    if (!isLimitOrder) {
      this.jobTradeService.queuesMarket.push(result['_doc']);
    } else {
      this.jobTradeService.queuesLimitOrder.push(result['_doc']);
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
    const result = await this.model.updateOne(
      {
        _id: data._id,
        userAddress,
      },
      {
        $set: {
          ...data,
          limitOrderExpirationDate: new Date(data.limitOrderDuration * 1000 + now.getTime()),
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

  async getAllActiveTrades(query: NetworkAndPaginationAndSortDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { state: { $in: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED] } },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
  }

  async getAllHistoryTrades(query: NetworkAndPaginationAndSortDto) {
    const { page, limit, sortBy = "createdAt", sortType = -1 } = query;

    return await this.model.paginate(
      { state: { $nin: [TRADE_STATE.OPENED, TRADE_STATE.QUEUED, TRADE_STATE.CREATED] } },
      {
        page,
        limit,
        sort: { [sortBy]: sortType },
      },
    );
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

  async bulkWrite(bw: any[]) {
    await this.model.bulkWrite(bw);
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
