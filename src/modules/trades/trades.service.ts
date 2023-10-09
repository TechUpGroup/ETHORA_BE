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
import { Timeout } from "@nestjs/schedule";
import { tradesHistories } from "common/config/data-sample";

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

  async updateTrade(address: string, data: UpdateTradeDto) {
    return { address, data };
  }

  async closeTrade(userAddress: string, data: CloseTradeDto) {
    return { userAddress, data };

    //   {
    //     "_partial": false,
    //     "_saved_in_db": true,
    //     "_custom_generated_pk": false,
    //     "queue_id": 4372,
    //     "option_id": 666,
    //     "signature_timestamp": 1696871988,
    //     "state": "OPENED",
    //     "is_above": true,
    //     "close_time": 1696872139,
    //     "user_partial_signature": "0xa1df299a0833a3833bb7984e526014b48b7d98cf07afcd47f5912b2abdd22eed3cec51e6aad962f3d6905eb89519b38f592d5685300aaa1b905d80edc88d923c1b",
    //     "open_timestamp": 1696872033,
    //     "expiration_time": 1696872333,
    //     "is_limit_order": false,
    //     "settlement_fee_signature": "0x02dee511088316d8181dddb1ffa943e089b9a3df94adae332d1054a5ca3f77593b62033398ae420600fa340a222cf01c2256ae7ede79e0f901482d3b5a3e7a401b",
    //     "trade_size": "5000000",
    //     "limit_order_duration": 0,
    //     "allow_partial_fill": true,
    //     "locked_amount": "9500014",
    //     "early_close_signature": "0xf36b66202695e572cbd6c50f16e3705516bb700cf8b013658cad3454eb6595fa797d566dce577b8247386c954bf637bca714e602e75f2833b9313ab8fa65fa991c",
    //     "token": "USDC",
    //     "target_contract": "0xE7774cD710524b711756fAf340cb5567BFFba048",
    //     "user_address": "0xB13332f8d4E81df0709d9Ffa15CB42D8dC0839c3",
    //     "cancellation_reason": null,
    //     "is_cancelled": false,
    //     "limit_order_expiration": 1696872033,
    //     "period": 300,
    //     "settlement_fee_sign_expiration": 1696872049,
    //     "router": "0xB52b89281Bff5D1d79Bc4F4181d08A6989201531",
    //     "strike": 2743775269413,
    //     "environment": "421613",
    //     "slippage": 5,
    //     "referral_code": "",
    //     "payout": null,
    //     "user_close_timestamp": 1696872095,
    //     "expiry_price": null,
    //     "settlement_fee": 500,
    //     "user_full_signature": "0xd82dc3fc1397298262445edb5982a9b1c1d2deb931680a9eae0bcb1c27b563af32bc0211e3009fd56ecb3c24834503248fcfb1df996ed6676490abf8555410261b",
    //     "id": 4390,
    //     "trader_nft_id": 0,
    //     "queued_timestamp": 1696872033,
    //     "cancellation_timestamp": null
    // }
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
