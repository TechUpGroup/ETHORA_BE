import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IEventParams } from "../interfaces/helper.interface";
import { HelperService } from "./_helper.service";
import { ContractsService } from "modules/contracts/contracts.service";
import { EthPairsService } from "modules/eth-pair/eth-pair.service";
import { HistoryService } from "modules/history/history.service";
import { EthersService } from "modules/_shared/services/ethers.service";
import { DECIMAL_TOKEN, SYMBOL_STABLE, TOKEN } from "common/constants/asset";
import { Erc20__factory, Factory__factory } from "common/abis/types";
import { PoolCreatedEvent } from "common/abis/types/Factory";
import { Types } from "mongoose";
import { ContractName } from "common/constants/contract";

@Injectable()
export class JobSyncEthPairService {
  private lisStableCoin;
  constructor(
    private readonly helperService: HelperService,
    private readonly contractService: ContractsService,
    private readonly ethPairsService: EthPairsService,
    private readonly historyService: HistoryService,
    private readonly etherService: EthersService,
  ) {
    this.lisStableCoin = Object.values(TOKEN).map((a) => a.toLowerCase());
  }
  private isRunning = {};

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {
    try {
      const factorys = await this.contractService.getContractByNames(ContractName.FACTORY_V3);
      if (!factorys.length) return;
      for (const factory of factorys) {
        const { network } = factory;
        if (this.isRunning[network]) return;
        this.isRunning[network] = true;
        try {
          try {
            await this.helperService.excuteSync({
              contract: factory,
              network,
              acceptEvents: ["PoolCreated"],
              ABI: Factory__factory.abi,
              callback: this.handleEvents,
            });
          } catch (err) {
            console.log("JobSyncServiceV3 -> start: ", err);
          }
        } finally {
          this.isRunning[network] = false;
        }
      }
    } catch (err) {
      console.log("JobSyncServiceV3 -> querydb: ", err);
    }
  }

  private handleEvents = async ({ events: listEvents, contract, eventHashes }: IEventParams) => {
    try {
      if (!listEvents.length) return;
      const { network } = contract;
      const txsHashExists = await this.historyService.findTransactionHashExists(eventHashes);
      const events = this.helperService.filterEvents(listEvents, txsHashExists);

      // get time of block
      const blocktimestamps = {};
      const listBlockNumber = [...new Set(events.map((i) => i.blockNumber))];
      const listBlockTime = await Promise.all(
        listBlockNumber.map((blockNumber) => this.etherService.getBlockTime(contract.network, blockNumber)),
      );
      listBlockTime.forEach((blockTime, i) => (blocktimestamps[listBlockNumber[i]] = blockTime));

      const historyCreateArr: any[] = [];
      const ethCreateArr: any[] = [];
      for (const event of events) {
        const { token0, token1, pool } = (event as PoolCreatedEvent).args;
        if (this.lisStableCoin.includes(token0.toLowerCase()) || this.lisStableCoin.includes(token1.toLowerCase())) {
          const tokenLauched = this.lisStableCoin.includes(token0.toLowerCase()) ? token1 : token0;
          const token = this.lisStableCoin.includes(token0.toLowerCase()) ? token0 : token1;
          const indexPair = ethCreateArr.findIndex((ethPair) => ethPair.pair.toLowerCase() === pool.toLowerCase());
          if (indexPair === -1) {
            const contractInstTokenLauched = this.etherService.getContract(network, tokenLauched, Erc20__factory.abi);
            try {
              const [symbolLaunched, deceimalLaunched, nameLaunched, ownerTokenLaunched] = await Promise.all([
                contractInstTokenLauched.symbol(),
                contractInstTokenLauched.decimals(),
                contractInstTokenLauched.name(),
                contractInstTokenLauched.owner(),
              ]);
              const find = Object.entries(TOKEN).find(([, value]) => value.toLowerCase() === token.toLowerCase());
              if (!find) continue;
              const symbol = SYMBOL_STABLE[find[0]];
              const decimal = DECIMAL_TOKEN[symbol];
              ethCreateArr.push({
                network,
                pair: pool.toLowerCase(),
                owner_token_launched: ownerTokenLaunched,
                token_launched: tokenLauched.toLowerCase(),
                name_launched: nameLaunched,
                symbol_launched: symbolLaunched,
                decimal_launched: Number(deceimalLaunched) || 18,
                reserver_launched: new Types.Decimal128("0"),
                token: token.toLowerCase(),
                symbol,
                decimal,
                reserver: new Types.Decimal128("0"),
                token_launched_index: tokenLauched.toLowerCase() === token0.toLowerCase() ? 0 : 1,
                version: 3,
                trading_time: blocktimestamps[event.blockNumber],
              });
            } catch (e) {
              console.log(e);
            }
          }
          const indexHistory = historyCreateArr.findIndex(
            (history) => history.txHash.toLowerCase() === event.transactionHash.toLowerCase(),
          );
          if (indexHistory === -1) {
            historyCreateArr.push({
              txHash: event.transactionHash.toLowerCase(),
              network,
            });
          }
        }
      }

      await Promise.all([
        ethCreateArr.length ? this.ethPairsService.saveEthPairs(ethCreateArr): undefined,
        historyCreateArr.length ? this.historyService.saveHistories(historyCreateArr): undefined,
      ]);
    } catch (err) {
      console.log("JobSyncService -> handleEvents: ", err);
    }
  };
}
