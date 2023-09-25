import { Cache } from "cache-manager";

import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  public async setKey(key: string, data: string, ttl: number): Promise<void> {
    await this.cacheManager.set(key, data, ttl);
  }

  public getKey(key: string): Promise<string | undefined> {
    return this.cacheManager.get(key);
  }

  public removeKey(key: string): Promise<any> {
    return this.cacheManager.del(key);
  }

  public resetAll(): Promise<any> {
    return this.cacheManager.reset();
  }
}
