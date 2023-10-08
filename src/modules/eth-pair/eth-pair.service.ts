import { Injectable } from "@nestjs/common";
import { ETH_PAIR_MODEL, EthPair, EthPairDocument } from "./schema/eth-pair.schema";
import { InjectModel } from "@nestjs/mongoose";
import { PaginateModel } from "mongoose";
import BigNumber from "bignumber.js";
import { CoingeckoService } from "modules/_shared/services/coingecko.service";
import {
  caculatorFDV,
  caculatorInitLQ,
  caculatorPriceListing,
  caculatorRatioSupplyAdded,
  caculatorVolume,
} from "common/utils/convert";
import { EthersService } from "modules/_shared/services/ethers.service";
import { Erc20__factory } from "common/abis/types";
import { Network } from "common/enums/network.enum";
import { SYMBOL_NETWORK } from "common/constants/asset";

@Injectable()
export class EthPairsService {
  constructor(
    @InjectModel(ETH_PAIR_MODEL)
    private readonly ethPairsModel: PaginateModel<EthPairDocument>,
    private readonly coingeckoService: CoingeckoService,
    private readonly ethersService: EthersService,
  ) {}

  saveEthPairs(items: EthPair | EthPair[]) {
    if (Array.isArray(items)) {
      return this.ethPairsModel.insertMany(items);
    }
    return this.ethPairsModel.create(items);
  }

  async getAllPair(network = Network.base) {
    const result = await this.ethPairsModel.aggregate([
      {
        $match: { 
          pair: { $ne: null },
          network
        },
      },
      {
        $group: {
          _id: "$version",
          pair: { $push: "$pair" },
        },
      },
    ]);
    const pairV2 = result.find((a) => a._id === 2);
    const pairV3 = result.find((a) => a._id === 3);
    return {
      pairV2: pairV2?.pair || [],
      pairV3: pairV3?.pair || [],
    };
  }

  findPair(pair: string) {
    return this.ethPairsModel.findOne({ pair });
  }

  findPairByTokenLauched(tokenLaunched: string) {
    return this.ethPairsModel.findOne({ token_launched: tokenLaunched });
  }

  async getTotalETHByTokenLauched(pair: EthPairDocument, balance: string) {
    const { reserver, reserver_launched } = pair;
    return BigNumber(reserver_launched.toString()).gt(0)
      ? BigNumber(reserver.toString()).div(reserver_launched.toString()).multipliedBy(balance)
      : BigNumber(0);
  }

  async getPriceTokenLauched(
    pair: { reserver: string; reserverLaunched: string; decimalLaunched: number; symbol: string },
    allPrice?: any,
  ) {
    if (!allPrice) {
      allPrice = await this.coingeckoService.getAllPrice();
    }
    const { reserver, reserverLaunched, decimalLaunched, symbol } = pair;
    return caculatorPriceListing(reserver, reserverLaunched, 18, decimalLaunched, allPrice[symbol]);
  }

  getAllByPair(pairs: string[]) {
    return this.ethPairsModel.find({ pair: { $in: pairs } });
  }

  /*-------------------------------------------------------------------------------
    ************************************ CRON-JOB *******************************
  ----------------------------------------V2 + V3---------------------------------*/
  async processInitReserver(
    network: Network,
    pair: EthPairDocument,
    reserverStable: string,
    reserverLaunched: string,
    allPrice: any,
  ) {
    const { _id, symbol, decimal_launched, token_launched } = pair;

    let fdv = 0;
    let supplyAddedLiquidity = "0";
    const { priceUSD } = caculatorPriceListing(
      reserverStable,
      reserverLaunched,
      18,
      decimal_launched,
      allPrice[symbol ||SYMBOL_NETWORK[network]],
    );
    const initLiquidity = caculatorInitLQ(reserverStable, allPrice[symbol ||SYMBOL_NETWORK[network]]);
    try {
      const contractInstTokenLauched = this.ethersService.getContract(network, token_launched, Erc20__factory.abi);
      const totalSuply = await contractInstTokenLauched.totalSupply();
      if (totalSuply) {
        fdv = caculatorFDV(totalSuply.toString(), +priceUSD, decimal_launched);
        supplyAddedLiquidity = caculatorRatioSupplyAdded(reserverLaunched, totalSuply.toString());
      }

      return this.ethPairsModel.findOneAndUpdate(
        { _id },
        {
          reserver_launched: reserverLaunched,
          reserver: reserverStable,
          init_lq: initLiquidity,
          listing_price: priceUSD,
          supply_added_lq: supplyAddedLiquidity,
          fdv,
          total_supply: totalSuply.toString(),
        },
        { new: true },
      );
    } catch (e) {
      throw e;
    }
  }

  async updateReserver(network: Network, pair: EthPairDocument, reserver0: string, reserver1: string) {
    const allPrice = await this.coingeckoService.getAllPrice();
    const { _id, token_launched_index, reserver, reserver_launched, version } = pair;

    let reserverStable;
    let reserverLaunched;

    if (version === 2) {
      if (token_launched_index) {
        reserverStable = reserver0;
        reserverLaunched = reserver1;
      } else {
        reserverStable = reserver1;
        reserverLaunched = reserver0;
      }
    } else {
      reserverStable = reserver0;
      reserverLaunched = reserver1;
    }

    if (reserver.toString() === "0" || reserver_launched.toString() === "0") {
      return this.processInitReserver(network, pair, reserverStable, reserverLaunched, allPrice);
    }

    return this.ethPairsModel.findOneAndUpdate(
      { _id },
      {
        reserver_launched: reserverLaunched,
        reserver: reserverStable,
      },
      { new: true },
    );
  }

  async updateVolume(pairAddress: string, reserver0: string, reserver1: string) {
    const [allPrice, pair] = await Promise.all([this.coingeckoService.getAllPrice(), this.findPair(pairAddress)]);
    if (!pair) return;
    const { _id, token_launched_index, symbol, version, network } = pair;

    let reserverStable;
    if (version === 2) {
      if (token_launched_index) {
        reserverStable = reserver0;
      } else {
        reserverStable = reserver1;
      }
    } else {
      reserverStable = reserver0;
    }

    const volume = caculatorVolume(reserverStable, allPrice[symbol || SYMBOL_NETWORK[network]]);

    return this.ethPairsModel.findOneAndUpdate(
      { _id },
      {
        $inc: { total_volume: volume },
      },
      { new: true },
    );
  }
}
