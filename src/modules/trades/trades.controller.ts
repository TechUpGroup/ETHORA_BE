import { User } from "common/decorators/user.decorator";

import { Body, Controller, Get, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { TradesService } from "./trades.service";
import { Auth } from "common/decorators/http.decorators";
import {
  CancelTradeDto,
  CloseTradeDto,
  CreateTradeDto,
  GetTradesUserActiveDto,
  UpdateTradeDto,
} from "./dto/trades.dto";
import { UsersDocument } from "modules/users/schemas/users.schema";

@ApiTags("Trades")
@Controller("trades")
export class TradesController {
  constructor(private readonly service: TradesService) {}

  @Post("create")
  @Auth()
  @ApiOperation({ summary: `Create a trade` })
  createTrade(@User() user: UsersDocument, @Body() data: CreateTradeDto) {
    return this.service.createTrade(user.address, data);
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
    return this.service.cancelTrade(user.address, data);
  }

  @Post("cancel")
  @Auth()
  @ApiOperation({ summary: `Cancel a trade` })
  cancelTrade(@User() user: UsersDocument, @Body() data: CancelTradeDto) {
    return this.service.cancelTrade(user.address, data);
  }

  @Get("user/active")
  @Auth()
  @ApiOperation({ summary: `Get Active User Trades` })
  getActiveUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getActiveUserTrades(user.address, query);
  }

  @Get("user/limit-orders")
  @Auth()
  @ApiOperation({ summary: `Get Limit Orders User Trades` })
  getLimitOrdersUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getLimitOrdersUserTrades(user.address, query);
  }

  @Get("user/history")
  @Auth()
  @ApiOperation({ summary: `Get History User Trades` })
  getHistoryUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getHistoryUserTrades(user.address, query);
  }

  @Get("user/cancelled")
  @Auth()
  @ApiOperation({ summary: `Get Cancelled User Trades` })
  getCancelledUserTrades(@User() user: UsersDocument, @Query() query: GetTradesUserActiveDto) {
    return this.service.getCancelledUserTrades(user.address, query);
  }
}
