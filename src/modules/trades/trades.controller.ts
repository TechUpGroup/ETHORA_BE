import { User } from "common/decorators/user.decorator";

import { Body, Controller, Get, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { TradesService } from "./trades.service";
import { Auth, AuthOptional } from "common/decorators/http.decorators";
import {
  CancelTradeDto,
  CloseTradeDto,
  CreateTradeDto,
  GetTradesUserActiveDto,
  UpdateTradeDto,
} from "./dto/trades.dto";
import { UsersDocument } from "modules/users/schemas/users.schema";
import MongooseClassSerializerInterceptor from "common/interceptors/mongodb.interceptor";
import { Trades } from "./schemas/trades.schema";
import { NetworkAndPaginationAndSortDto } from "common/dto/network.dto";

@ApiTags("Trades")
@Controller("trades")
@UseInterceptors(MongooseClassSerializerInterceptor(Trades))
export class TradesController {
  constructor(private readonly service: TradesService) {}

  @Post("create")
  @Auth()
  @ApiOperation({ summary: `Create a trade` })
  createTrade(@User() user: UsersDocument, @Body() data: CreateTradeDto) {
    return this.service.createTrade(user, data);
  }

  @Put("update")
  @Auth()
  @ApiOperation({ summary: `Update a trade` })
  updateTrade(@User() user: UsersDocument, @Body() data: UpdateTradeDto) {
    return this.service.updateTrade(user.address, data);
  }

  @Post("close")
  @Auth()
  @ApiOperation({ summary: `Close a trade` })
  closeTrade(@User() user: UsersDocument, @Body() data: CloseTradeDto) {
    return this.service.closeTrade(user.address, data);
  }

  @Post("cancel")
  @Auth()
  @ApiOperation({ summary: `Cancel a trade` })
  cancelTrade(@User() user: UsersDocument, @Body() data: CancelTradeDto) {
    return this.service.cancelTrade(user.address, data);
  }

  @Get("all_active")
  @ApiOperation({ summary: `Get All Active Trades of Platform` })
  getAllActiveTrades(@Query() query: NetworkAndPaginationAndSortDto) {
    return this.service.getAllActiveTrades(query);
  }

  @Get("all_history")
  @ApiOperation({ summary: `Get All History Trades of Platform` })
  getAllHistoryTrades(@Query() query: NetworkAndPaginationAndSortDto) {
    return this.service.getAllHistoryTrades(query);
  }

  @Get("user/active")
  @AuthOptional()
  @ApiOperation({ summary: `Get Active User Trades (Markets only)` })
  getActiveUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getActiveUserTrades(query?.userAddress || user?.address, query);
  }

  @Get("user/limit-orders")
  @AuthOptional()
  @ApiOperation({ summary: `Get Active User Trades (Limit Orders only)` })
  getLimitOrdersUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getLimitOrdersUserTrades(query?.userAddress || user?.address, query);
  }

  @Get("user/history")
  @AuthOptional()
  @ApiOperation({ summary: `Get History User Trades` })
  getHistoryUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getHistoryUserTrades(query?.userAddress || user?.address, query);
  }

  @Get("user/cancelled")
  @AuthOptional()
  @ApiOperation({ summary: `Get Cancelled User Trades` })
  getCancelledUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getCancelledUserTrades(query?.userAddress || user?.address, query);
  }

  @Get("queue")
  @Auth()
  @ApiOperation({ summary: `Get queue` })
  getQueue() {
    return this.service.queue();
  }
}
