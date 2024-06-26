import { LogsModule } from "modules/logs/logs.module";

import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";

import { CacheService } from "./services/cache.service";
import { EthersService } from "./services/ethers.service";
import { CoingeckoService } from "./services/coingecko.service";
import { SocketPriceService } from "./services/socket-price.service";

const providers = [CacheService, EthersService, CoingeckoService, SocketPriceService];
const modules = [HttpModule, LogsModule];

@Global()
@Module({
  providers,
  imports: modules,
  exports: [...providers, ...modules],
})
export class SharedModule {}
