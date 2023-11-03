
import { Log } from "@ethersproject/abstract-provider";
import { Injectable } from "@nestjs/common";

import { callTimeExecute } from "common/utils";
import { EthersService } from "modules/_shared/services/ethers.service";
import { BlocksDocument } from "modules/blocks/schemas/blocks.schema";
import { isNil } from "lodash";
import { messageErr } from "common/constants/event";
import { BlocksService } from "modules/blocks/blocks.service";

@Injectable()
export class HelperService {
  private syncBlock = {};
  constructor(
    private readonly ethersService: EthersService,
    private readonly blocksService: BlocksService,
    ) {}

  filterEvents(events: Log[], txsHashExists: string[]) {
    return events.filter(
      ({ transactionHash, logIndex }) =>
        !txsHashExists.includes(`${transactionHash.toLowerCase().trim()}_${logIndex}`),
    );
  }

  async getLogs({ network, blocknumber_synced }: BlocksDocument) {
    try {
      if (isNil(this.syncBlock[network])) {
        this.syncBlock[network] = 100;
      }
      const blockNumber = this.ethersService.getBlockNumber(network);
      const provider = this.ethersService.getProviderSyncBlock(network);
      const fromBlock = blocknumber_synced - 10;
      const nextBlock = blocknumber_synced + this.syncBlock[network];
      const targetBlock = nextBlock > blockNumber ? blockNumber : nextBlock;
      const toBlock = targetBlock > fromBlock ? targetBlock : fromBlock;

      if (fromBlock > blockNumber) {
        if (!blockNumber) {
          throw new Error(`fromBlock > blockNumber: ${fromBlock} > ${blockNumber}`);
        }
        throw new Error(messageErr);
      }

      const logs = await provider.getLogs({
        fromBlock,
        toBlock,
        // topics: [TOPIC.EXERCISE, TOPIC.EXPIRE]
      });
      this.syncBlock[network] = 100;
      return {
        blockNumber,
        fromBlock,
        toBlock,
        logs,
      };
    } catch (err) {
      if (err.message.includes("query returned more than 10000 results")) {
        this.syncBlock[network] = Math.floor(this.syncBlock[network] / 3);
      }
      throw err;
    }
  }

  async updateBlock(
    block: BlocksDocument,
    allLogsCount: number,
    numberLogs: number,
    fromBlock: number,
    toBlock: number,
    startTime: [number, number],
    endTime: number,
  ) {
    try {
      // update blocknumber synced
      const updatedBlock = await this.blocksService.updateBlocknumberSynced(block._id, toBlock + 1);

      // save logs
      const message = `(${Math.round(endTime)}ms || ${callTimeExecute(startTime)}ms)`;

      console.info(`Sync block => ${fromBlock}->${toBlock}: ${numberLogs}/${allLogsCount} logs ${message}`);
      return updatedBlock;
    } catch {
      throw new Error("Update block error");
    }
  }


}
