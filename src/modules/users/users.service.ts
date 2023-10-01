import { PaginateModel } from "mongoose";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { USERS_MODEL, UsersDocument } from "./schemas/users.schema";
import { ErrorMessages } from "./users.constant";
import { request } from "graphql-request";
import config from "common/config";
import { readFile } from "common/utils/string";
import { MetricsGql, UserStatsResponse } from "./dto/stats.dto";
import { ChainId, Network } from "common/enums/network.enum";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USERS_MODEL)
    private readonly usersModel: PaginateModel<UsersDocument>,
  ) {}

  async queryUsers(filter: any, options: any) {
    const users = await this.usersModel.paginate(filter, options);
    return users;
  }

  async isAddressTaken(address: string) {
    const checkAddress = await this.usersModel.findOne({ address });
    if (checkAddress) {
      return true;
    }
    return false;
  }

  async create(address: string) {
    if (await this.isAddressTaken(address)) {
      throw new BadRequestException(ErrorMessages.ADDRESS_EXISTS);
    }
    return this.usersModel.create({ address });
  }

  async getUser(id: string) {
    const user = await this.usersModel.findById(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserById(id: string) {
    return await this.usersModel.findById(id);
  }

  async updateNonce(id: string, nonce: string) {
    const user = await this.usersModel.findOneAndUpdate({ _id: id }, { nonce }, { new: true });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getUserByAddress(address: string) {
    const user = await this.findUserByAddress(address);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async findUserByAddress(address: string) {
    const user = await this.usersModel.findOne({
      address: address.trim().toLowerCase(),
    });
    return user;
  }

  async findUserById(id: string) {
    const user = await this.usersModel.findById(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async findOrCreateUserByAddress(address: string) {
    const user = await this.findUserByAddress(address);
    if (!user) {
      return await this.create(address);
    }
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.usersModel.findOneAndDelete({ _id: id });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async updateRole(address: string, role: string) {
    return this.usersModel.findOneAndUpdate(
      { address: address.toLowerCase().trim() },
      { $set: { role } },
      { new: true },
    );
  }

  async getInfoUser(username: string) {
    const user = await this.usersModel.findOne(
      { $or: [{ username }, { address: username }], banned: false },
      {
        _id: 1,
        address: 1,
        username: 1,
        fullname: 1,
        image: 1,
        social: 1,
        avatar: 1,
        banner: 1,
        bio: 1,
      },
    );
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async postFaucet(address: string) {
    const user = await this.usersModel.find({
      address,
    });
    return user;
  }

  async getStats(address: string, chain: ChainId): Promise<UserStatsResponse> {
    const graphql = config.getGraphql(Object.keys(ChainId)[Object.values(ChainId).indexOf(chain)] as Network);
    const metricsGql = readFile("./graphql/stats.gql", __dirname);
    const data: MetricsGql = await request<MetricsGql>(graphql.uri, metricsGql, { address }).catch((error) => {
      console.error(error);
      return {} as MetricsGql;
    });

    // rank
    const daily = data.userStatsDaily?.findIndex((e) => e.user.toLowerCase() === address) || -1;
    const weekly = data.userStatsWeekly?.findIndex((e) => e.user.toLowerCase() === address) || -1;

    //
    let winTrade = 0;
    let totalTrade = 0;
    const metrics: UserStatsResponse["metrics"] = {
      referral: {
        totalRebateEarned: 0,
        totalVolumeTrades: 0,
        totalTrades: 0,
        totalTradesDetail: null,
      },
    };
    const tmpMostAssets: { [key: string]: number } = {};
    data.userOptionDatas?.forEach((e) => {
      const { asset, address, token } = e.optionContract;
      totalTrade++;
      tmpMostAssets[asset] = (tmpMostAssets[asset] || 0) + 1;
      if (!metrics[token]) {
        metrics[token] = {
          contract: address,
          totalPayout: 0,
          netPnl: 0,
          openInterest: 0,
          volume: 0,
        };
      }
      if (e.payout > 0) {
        winTrade++;
        metrics[token].totalPayout += +e.payout;
        metrics[token].netPnl += e.payout - e.totalFee;
        metrics[token].volume += +e.totalFee;
      }
    });

    // interest
    data.activeData?.forEach((e) => (metrics[e.optionContract.token].openInterest += +e.totalFee));

    // referral

    return {
      stats: {
        daily,
        weekly,
        winTrade,
        totalTrade,
        mostTradedContract: Object.keys(tmpMostAssets).sort((a, b) => tmpMostAssets[a] - tmpMostAssets[b])[0] || null,
      },
      metrics,
    };
  }

  async getListUserByIds(ids: string[]) {
    const users = await this.usersModel.aggregate([
      { $match: { _id: { $in: ids } } },
      { $addFields: { __order: { $indexOfArray: [ids, "$_id"] } } },
      { $sort: { __order: 1 } },
    ]);
    return users;
  }

  async checkUsernameExists(username: string) {
    const user = await this.usersModel.findOne({ username }, { _id: 1 });
    return !!user;
  }
}
