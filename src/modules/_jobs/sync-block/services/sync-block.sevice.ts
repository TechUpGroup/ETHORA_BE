import { Log } from "@ethersproject/abstract-provider";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BlocksService } from "modules/blocks/blocks.service";
import { TOPIC } from "common/constants/asset";
import { Network } from "common/enums/network.enum";
import { BlocksDocument } from "modules/blocks/schemas/blocks.schema";
import { callTimeExecute } from "common/utils";
import { BtcusdBinaryOptions__factory } from "common/abis/types";
import { Interface } from "@ethersproject/abi";
import { LogsService } from "modules/logs/logs.service";
import { HistoryService } from "modules/history/history.service";
import { HelperService } from "./_helper.service";
import { messageErr } from "common/constants/event";
import config from "common/config";
import { TRADE_STATUS } from "common/enums/trades.enum";
import { TradesService } from "modules/trades/trades.service";

const IBinaryOptions = new Interface(BtcusdBinaryOptions__factory.abi);

@Injectable()
export class JobSyncBlockService {
  constructor(
    private readonly helperService: HelperService,
    private readonly blocksService: BlocksService,
    private readonly logsService: LogsService,
    private readonly historiesService: HistoryService,
    private readonly tradesService: TradesService,
  ) {}
  private isRunning = false;

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async start() {
    const network = config.isDevelopment ? Network.goerli : Network.base;
    const block = await this.blocksService.getBlockByNetwork(network);
    if (!block) return;
    try {
      if (this.isRunning) return;
      this.isRunning = true;
      await this.handleBlock(block);
    } catch (err) {
      this.logsService.createLog("JobSyncBlockService -> start:", err);
    } finally {
      this.isRunning = false;
    }
  }

  private async handleBlock(block: BlocksDocument) {
    try {
      const startTime = process.hrtime();
      const { blockNumber, fromBlock, toBlock, logs } = await this.helperService.getLogs(block);
      const endTime = callTimeExecute(startTime);
      const countLogFiltered = await this.handleLogs(logs, block.network);
      const updatedBlock = await this.helperService.updateBlock(
        block,
        logs.length,
        countLogFiltered,
        fromBlock,
        toBlock,
        startTime,
        endTime,
      );

      // continue sync if not latest
      if (updatedBlock && toBlock < blockNumber) {
        await this.handleBlock(updatedBlock);
      }
    } catch (err) {
      console.log("JobSyncBlockService -> handleBlock: ", err);
      if (!err?.message?.includes(messageErr)) {
        this.logsService.createLog("JobSyncBlockService -> handleBlock:", err.message);
      }
    }
  }

  private async handleLogs(allLogs: Log[], network: Network) {
    if (!allLogs.length) return 0;
    const targetLogs = allLogs.filter(log => log.topics.includes(TOPIC.EXPIRE) || log.topics.includes(TOPIC.EXERCISE));
    const eventHashes = targetLogs.map((event) => `${event.transactionHash.toLowerCase().trim()}_${event.logIndex}`);
    const txsHashExists = await this.historiesService.findTransactionHashBlockExists(eventHashes, network);
    const events = this.helperService.filterEvents(targetLogs, txsHashExists);

    const historyCreateArr: any[] = [];
    const bulkUpdate: any[] = [];
    const contractOptionIds: string[] = [];
    const profits: any = {};
    for (const event of events) {
      const { transactionHash, topics, logIndex, address } = event;
      historyCreateArr.push({
        tx_hash_log_index: `${transactionHash.toLowerCase().trim()}_${logIndex}`,
        network,
      });
      if (topics.includes(TOPIC.EXPIRE)) {
        const { id } = IBinaryOptions.parseLog(event).args;
        bulkUpdate.push({
          updateOne: {
            filter: {
              contractOption: `${address.toLowerCase().trim()}_${id.toString()}`,
            },
            update: {
              status: TRADE_STATUS.LOSS,
              profit: 0,
            },
          },
        });
      }
      if (topics.includes(TOPIC.EXERCISE)) {
        const { id, profit } = IBinaryOptions.parseLog(event).args;
        contractOptionIds.push(`${address.toLowerCase().trim()}_${id.toString()}`);
        profits[+id.toString()] = +profit.toString()
      }
    }

    // filter status trade
    const trades = await this.tradesService.getAllTradesByOptionIdsAndTargetContract(contractOptionIds);
    trades.forEach(trade => {
      if (trade.optionId) {
        const profit = profits[trade.optionId];
        let status = TRADE_STATUS.LOSS;
        if(profit > Number(trade.tradeSize)) {
          status = TRADE_STATUS.WIN
        }
        bulkUpdate.push({
          updateOne: {
            filter: {
              contractOption: `${trade.targetContract}_${trade.optionId}`,
            },
            update: {
              status,
              profit,
              pnl: profit - Number(trade.tradeSize)
            },
          },
        });
      }
    })

    await Promise.all([
      historyCreateArr.length ? this.historiesService.saveHistoriesBlock(historyCreateArr) : undefined,
      bulkUpdate.length ? this.tradesService.bulkWrite(bulkUpdate) : undefined,
    ]);

    return events.length;
  }
}
