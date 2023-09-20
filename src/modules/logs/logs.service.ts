import { PaginateModel } from "mongoose";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { LOGS_MODEL, LogsDocument } from "./schemas/logs.schema";

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(LOGS_MODEL)
    private readonly logsModel: PaginateModel<LogsDocument>,
  ) {}

  async createLog(name: string, error: any, note?: string) {
    try {
      console.error(error);
      await this.logsModel.create({ name, message: error?.stack ?? error.message ?? error?.toString(), note });
    } catch (err) {
      console.error(err);
    }
  }
}
