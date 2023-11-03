import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { CacheService } from "./cache.service";
import config from "common/config";
import axios from "axios";
import { POOL } from "common/constants/price";

export const KEY_PRICE_COINGECKO = "all_price_coingecko";
export const KEY_PRICE_CHANGE_COINGECKO = "all_price_change_coingecko";

export enum Token {
  ETH = "ethereum",
  WETH = "weth",
  BNB = "binancecoin",
  WBNB = "wbnb",
}

@Injectable()
export class CoingeckoService {
  constructor(private readonly httpService: HttpService, private readonly cacheService: CacheService) {
    void this.start();
  }

  private isRunning = false;

  @Cron(CronExpression.EVERY_MINUTE)
  async start() {
    if (this.isRunning) return;
    try {
      this.isRunning = true;
      await Promise.all([this.getAllPrice(false), this.getAllPriceChange(false)]);
    } catch (e) {
      console.error(e);
    } finally {
      this.isRunning = false;
    }
  }

  async getAllPrice(isCache = true) {
    if (isCache) {
      const cachedPrice = await this.cacheService.getKey(KEY_PRICE_COINGECKO);
      if (cachedPrice) return JSON.parse(cachedPrice);
    }
    const tokens = Object.values(Token);
    const prices = await this.getPrice(tokens.toString());

    if (!prices || !Object.keys(prices).length) return {};

    const res: { [key: string]: any } = {};
    for (const [key, name] of Object.entries(Token)) {
      res[key] = prices[name].usd;
    }
    await this.cacheService.setKey(KEY_PRICE_COINGECKO, JSON.stringify(res), config.cacheTime * 1000);
    console.log("=> Price: ", JSON.stringify(res));
    return res;
  }

  async getAllPriceChange(isCache = true) {
    if (isCache) {
      const cachedPrice = await this.cacheService.getKey(KEY_PRICE_CHANGE_COINGECKO);
      if (cachedPrice) return JSON.parse(cachedPrice);
    }
    const pools = Object.keys(POOL);
    const datas: any[] = await this.getChangeFromBuffer(pools);

    if (!datas || !datas.length) return {};

    const res: { [key: string]: any } = {};
    for (const pool of Object.keys(POOL)) {
      const find = datas.find((a) => a.pair === pool);
      res[pool] = find.change.toString();
    }
    await this.cacheService.setKey(KEY_PRICE_CHANGE_COINGECKO, JSON.stringify(res), config.cacheTime * 1000);
    console.log("=> Price change percentage : ", JSON.stringify(res));
    return res;
  }

  private async getPool(pools: string[], network = "eth") {
    const res = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/${network}/pools/multi/${pools.toString()}`,
    );
    if (res) {
      return res.data.data;
    }
    return;
  }

  private async getChangeFromBuffer(pools: string[]) {
    const res = await axios.post(`https://oracle.buffer.finance/price/bulk_24h_change/`, pools, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,vi;q=0.8",
        "content-type": "application/json",
      },
    });
    if (res) {
      return res.data;
    }
    return;
  }

  private async getPrice(ids: string) {
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (res) {
      return res.data;
    }
    return;
  }
}
