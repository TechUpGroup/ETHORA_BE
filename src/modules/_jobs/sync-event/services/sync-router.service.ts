import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IEventParams } from "../interfaces/helper.interface";
import { HelperService } from "./_helper.service";
import { ContractsService } from "modules/contracts/contracts.service";
import { HistoryService } from "modules/history/history.service";
import { EthersService } from "modules/_shared/services/ethers.service";
import { RouterAbi__factory } from "common/abis/types";
import { ContractName } from "common/constants/contract";
import { OpenTradeEvent } from "common/abis/types/RouterAbi";
import { TradesService } from "modules/trades/trades.service";
import { JobTradeService } from "modules/_jobs/trades/job-trade.service";
import { LogsService } from "modules/logs/logs.service";

@Injectable()
export class JobSyncRouterService {
  constructor(
    private readonly helperService: HelperService,
    private readonly contractService: ContractsService,
    private readonly historyService: HistoryService,
    private readonly etherService: EthersService,
    private readonly tradeService: TradesService,
    private readonly jobTradeService: JobTradeService,
    private readonly logsService: LogsService,
  ) {}
  private isRunning = false;

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {
    const router = await this.contractService.getContractByName(ContractName.ROUTER);
    if (!router) return;
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      try {
        await this.helperService.excuteSync({
          contract: router,
          network: router.network,
          acceptEvents: ["OpenTrade"],
          ABI: RouterAbi__factory.abi,
          callback: this.handleEvents,
        });
      } catch (err) {
        this.logsService.createLog("JobSyncRouterService -> start:", err);
        console.log("JobSyncRouterService -> start: ", err);
      }
    } finally {
      this.isRunning = false;
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
      const openTradeArr: any[] = [];
      const openTradeQueueIds: any = {};
      for (const event of events) {
        const { queueId, optionId } = (event as OpenTradeEvent).args;

        openTradeArr.push({
          updateOne: {
            filter: {
              queueId: queueId.toString(),
            },
            update: {
              optionId: optionId.toString(),
            },
          },
        });
        openTradeQueueIds[queueId.toString()] = optionId.toString();

        historyCreateArr.push({
          txHash: event.transactionHash.toLowerCase(),
          network,
        });
      }

      // update to queue
      this.jobTradeService.listActives.forEach((item, index) => {
        if (openTradeQueueIds[item.queueId]) {
          this.jobTradeService.listActives[index].optionId = openTradeQueueIds[item.queueId];
        }
      });

      // save to db
      await Promise.all([
        openTradeArr.length ? this.tradeService.bulkWrite(openTradeArr) : undefined,
        historyCreateArr.length ? this.historyService.saveHistories(historyCreateArr) : undefined,
      ]);
    } catch (err) {
      console.log("JobSyncRouterService -> handleEvents: ", err);
      this.logsService.createLog("JobSyncRouterService", err);
    }
  };
}
