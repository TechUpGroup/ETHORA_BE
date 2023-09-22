import config from "common/config";

import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class GlobalGuard implements CanActivate {
  constructor() {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    return true;
  }
}
