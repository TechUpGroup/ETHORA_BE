import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IEventParams } from "../interfaces/helper.interface";
import { HelperService } from "./_helper.service";
import { ContractsService } from "modules/contracts/contracts.service";
import { HistoryService } from "modules/history/history.service";
import { RouterAbi__factory } from "common/abis/types";
import { ContractName } from "common/constants/contract";
import { CancelTradeEvent, FailResolveEvent, FailUnlockEvent, OpenTradeEvent } from "common/abis/types/RouterAbi";
import { TradesService } from "modules/trades/trades.service";
import { JobTradeService } from "modules/_jobs/trades/job-trade.service";
import { LogsService } from "modules/logs/logs.service";
import { REASON_FAIL, REASON_FAIL_RETRY, ROUTER_EVENT } from "common/constants/event";
import { TRADE_STATE } from "common/enums/trades.enum";
import { decryptAES } from "common/utils/encrypt";

@Injectable()
export class JobSyncRouterService {
  constructor(
    private readonly helperService: HelperService,
    private readonly contractService: ContractsService,
    private readonly historyService: HistoryService,
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
      await this.helperService.excuteSync({
        contract: router,
        network: router.network,
        acceptEvents: Object.values(ROUTER_EVENT),
        ABI: RouterAbi__factory.abi,
        callback: this.handleEvents,
      });
    } catch (err) {
      this.logsService.createLog("JobSyncRouterService -> start:", err);
      console.log("JobSyncRouterService -> start: ", err);
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

      // // get time of block
      // const blocktimestamps = {};
      // const listBlockNumber = [...new Set(events.map((i) => i.blockNumber))];
      // const listBlockTime = await Promise.all(
      //   listBlockNumber.map((blockNumber) => this.etherService.getBlockTime(contract.network, blockNumber)),
      // );
      // listBlockTime.forEach((blockTime, i) => (blocktimestamps[listBlockNumber[i]] = blockTime));

      const historyCreateArr: any[] = [];
      const bulkUpdate: any[] = [];
      const openTradeQueueIds: any = {};
      const retryTx: any[] = [];
      for (const event of events) {
        const { transactionHash, event: nameEvent, logIndex } = event;
        historyCreateArr.push({
          transaction_hash: transactionHash.toLowerCase(),
          log_index: logIndex,
          network,
        });
        if (nameEvent === ROUTER_EVENT.OPENTRADE) {
          const { queueId, optionId, expiration } = (event as OpenTradeEvent).args;
          bulkUpdate.push({
            updateOne: {
              filter: {
                queueId: queueId.toString(),
              },
              update: {
                optionId: optionId.toString(),
                expirationDate: expiration.toString(),
              },
            },
          });
          openTradeQueueIds[queueId.toString()] = {
            optionId: optionId.toString(),
            expirationDate: expiration.toString()
          };
        }
        if (nameEvent === ROUTER_EVENT.CANCELTRADE) {
          const { queueId, reason } = (event as CancelTradeEvent).args;
          bulkUpdate.push({
            updateOne: {
              filter: {
                queueId: queueId.toString(),
              },
              update: {
                status: TRADE_STATE.CANCELLED,
                isCancelled: true,
                cancellationReason: REASON_FAIL[reason] || "System error",
              },
            },
          });
        }
        if (nameEvent === ROUTER_EVENT.FAILRESOLVE) {
          const { queueId, reason } = (event as FailResolveEvent).args;
          bulkUpdate.push({
            updateOne: {
              filter: {
                queueId: queueId.toString(),
              },
              update: {
                status: TRADE_STATE.CANCELLED,
                isCancelled: true,
                cancellationReason: REASON_FAIL[reason] || "System error",
              },
            },
          });
        }
        if (nameEvent === ROUTER_EVENT.FAILUNLOCK) {
          const { optionId, reason } = (event as FailUnlockEvent).args;
          if (REASON_FAIL_RETRY[reason]) {
            retryTx.push(optionId);
          } else {
            bulkUpdate.push({
              updateOne: {
                filter: {
                  optionId: +optionId.toString(),
                },
                update: {
                  status: TRADE_STATE.CANCELLED,
                  isCancelled: true,
                  cancellationReason: REASON_FAIL[reason] || "System error",
                },
              },
            });
          }
        }
      }

      // retry when excuteOption close trade
      if (retryTx.length) {
        const trades = await this.tradeService.getAllTradesClosed(retryTx);
        const _trades = trades
          .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
          .map((trade) => {
            return {
              ...trade,
              oneCT: trade.user.oneCT,
              privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
            };
          });
        this.jobTradeService.listActives.push(..._trades);
      }

      // update to queue
      this.jobTradeService.listActives.forEach((item, index) => {
        if (openTradeQueueIds[item.queueId]) {
          this.jobTradeService.listActives[index].optionId = openTradeQueueIds[item.queueId].optionId;
          this.jobTradeService.listActives[index].expirationDate = openTradeQueueIds[item.queueId].expirationDate;
        }
      });

      // save to db
      await Promise.all([
        bulkUpdate.length ? this.tradeService.bulkWrite(bulkUpdate) : undefined,
        historyCreateArr.length ? this.historyService.saveHistories(historyCreateArr) : undefined,
      ]);
    } catch (err) {
      console.log("JobSyncRouterService -> handleEvents: ", err);
      this.logsService.createLog("JobSyncRouterService", err);
    }
  };
}
