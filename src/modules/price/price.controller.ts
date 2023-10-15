import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { CoingeckoService } from "modules/_shared/services/coingecko.service";

@ApiTags("Price")
@Controller("price")
@UseInterceptors(CacheInterceptor)
export class PricesController {
  constructor(private readonly coingeckoService: CoingeckoService) {}

  @Get("24h_change")
  @CacheTTL(60 * 1000)
  getAllContractByNetwork() {
    return this.coingeckoService.getAllPriceChange();
  }
}
