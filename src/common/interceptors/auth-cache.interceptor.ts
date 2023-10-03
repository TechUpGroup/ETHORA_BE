import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class AuthCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest();
    const oldKey = super.trackBy(context);
    const key = Buffer.from(`${req.headers["Authorization"] || req.headers["authorization"]}`.replace(/Bearer\s/, ''), "utf8").toString("hex");

    return `${oldKey}${key}`;
  }
}
