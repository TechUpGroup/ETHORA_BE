import { PaginateModel, Types } from "mongoose";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { USERS_MODEL, UsersDocument, WALLETS_MODEL, WalletsDocument } from "./schemas/users.schema";
import { entropyToMnemonic } from "@ethersproject/hdnode";
import { ErrorMessages } from "./users.constant";
import { Wallet } from "@ethersproject/wallet";
import { request } from "graphql-request";
import config from "common/config";
import { readFile } from "common/utils/string";
import { MetricsGql, UserStatsResponse } from "./dto/stats.dto";
import { EthersService } from "modules/_shared/services/ethers.service";
import { randomBytes } from "crypto";
import { encryptAES } from "common/utils/encrypt";
import { Network } from "common/enums/network.enum";
import { ContractName } from "common/constants/contract";
import { getCurrentDayIndex, getDayTimestamp, getWeekId, getWeekTimestamp } from "common/utils/date";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USERS_MODEL)
    private readonly usersModel: PaginateModel<UsersDocument>,
    @InjectModel(WALLETS_MODEL)
    private readonly walletsModel: PaginateModel<WalletsDocument>,
    private readonly ethersService: EthersService,
  ) {}

  private generateMnemonic() {
    return entropyToMnemonic(randomBytes(16));
  }

  generateWallet() {
    const mnemonic = this.generateMnemonic();
    const wallet: Wallet = this.ethersService.generateNewWallet(mnemonic, `m/44'/60'/0'/0/0`);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      balance: new Types.Decimal128("0"),
      mnemonic,
    };
  }

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

  async createOrUpdateAccount(network: Network, address: string) {
    try {
      const user = await this.usersModel.findOne({ address });
      if (user) {
        if (!user.mnemonic) {
          const wallet = this.generateWallet();
          user.mnemonic = encryptAES(wallet.mnemonic);
          user.oneCT = wallet.address;
          await user.save();
          await this.walletsModel.create({
            userId: user._id,
            network,
            address: wallet.address,
            privateKey: encryptAES(wallet.privateKey),
          });
        }
      } else {
        const wallet = this.generateWallet();
        const userCreated = await this.usersModel.create({
          mnemonic: encryptAES(wallet.mnemonic),
          oneCT: wallet.address,
        });
        await this.walletsModel.create({
          userId: userCreated._id,
          network,
          address: wallet.address,
          privateKey: encryptAES(wallet.privateKey),
        });
      }
    } catch (e) {
      console.log(e);
      return false;
    }
    return true;
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

  async findWalletByNetworkAndId(network: Network, userId: string) {
    const wallet = await this.walletsModel.findOne({
      userId: new Types.ObjectId(userId),
      network,
    });
    if (!wallet) {
      throw new NotFoundException(ErrorMessages.WALLET_NOT_FOUND);
    }
    return wallet;
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

  async getStats(address: string, network: Network): Promise<UserStatsResponse> {
    if (!address) {
      throw new BadRequestException("userAddress cannot empty");
    }

    const metricsGql = readFile("./graphql/stats.gql", __dirname);
    const graphql = config.getGraphql(network);
    const timestampDaily = getDayTimestamp(network, getCurrentDayIndex(network, 0));
    const timestampWeekly = getWeekTimestamp(network, getCurrentDayIndex(network, 0));
    const data: MetricsGql = await request<MetricsGql>(graphql.uri, metricsGql, {
      address: address.toLowerCase(),
      timestampDaily: `${timestampDaily}`,
      timestampWeekly: `${timestampWeekly}`,
    }).catch((error) => {
      console.error(error);
      return {} as MetricsGql;
    });

    // rank
    const daily = data.userStatsDaily?.findIndex((e) => e.user.toLowerCase() === address.toLowerCase()) + 1 || -1;
    const weekly = data.userStatsWeekly?.findIndex((e) => e.user.toLowerCase() === address.toLowerCase()) + 1 || -1;

    //
    let winTrade = 0;
    let totalTrade = 0;
    const metrics: UserStatsResponse["metrics"] = {
      referral: {
        totalRebateEarned: "0",
        totalVolumeTrades: "0",
        totalTrades: 0,
        tier: 1,
      },
      USDC: {
        contract: config.getContract(network, ContractName.USDC).address,
        totalPayout: 0,
        netPnl: 0,
        openInterest: 0,
        volume: 0,
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
      if (+e.payout > +e.totalFee) {
        winTrade++;
      }
      metrics[token].totalPayout += +e.payout;
      metrics[token].volume += +e.totalFee;
      metrics[token].netPnl += Number(e.payout) - Number(e.totalFee);
    });

    // interest
    data.activeData?.forEach((e) => (metrics[e.optionContract.token].openInterest += +e.totalFee));

    // referral
    const weeklyId = getWeekId();
    const referralData = data.referralDatas[0];
    if (referralData) {
      metrics["referral"] = {
        totalRebateEarned: referralData.totalRebateEarned,
        totalVolumeTrades:
          `${weeklyId}` === referralData.referrersWeeklyTimestamp ? referralData.referrersVolumeTradedWeekly : "0",
        totalTrades: `${weeklyId}` === referralData.referrersWeeklyTimestamp ? referralData.referrersTraded.length : 0,
        tier: 1,
      };
    }

    return {
      stats: {
        daily,
        weekly,
        winTrade,
        totalTrade,
        mostTradedContract:
          Object.keys(tmpMostAssets)
            .sort((a, b) => tmpMostAssets[b] - tmpMostAssets[a])[0]
            ?.replace("USD", "-USD") || null,
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
