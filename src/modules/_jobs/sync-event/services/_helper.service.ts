
import { Event } from "@ethersproject/contracts";
import { Injectable } from "@nestjs/common";

import { ContractParams } from "../interfaces/helper.interface";
import { ContractsService } from "modules/contracts/contracts.service";
import { callTimeExecute } from "common/utils";
import { EthersService } from "modules/_shared/services/ethers.service";

@Injectable()
export class HelperService {
  constructor(private readonly contractService: ContractsService, private readonly etherService: EthersService) {}

  filterEvents(events: Event[], txsHashExists: string[]) {
    return events.filter(
      ({ transactionHash, logIndex }) =>
        !txsHashExists.includes(`${transactionHash.toLowerCase()}_${logIndex}`),
    );
  }

  async excuteSync(params: ContractParams) {
    const { contract, callback } = params;
    const { _id, contract_address } = contract;
    const startTime = process.hrtime();
    const { fromBlock, toBlock, blocknumber, events, eventHashes } = await this.getEvents(params);
    const endTime = callTimeExecute(startTime);

    // excute logic
    void (await callback({ events, contract, eventHashes }));

    // update blocknumber synced
    const updatedContract = await this.contractService.updateBlocknumberSynced(_id, toBlock + 1);

    // save logs
    const message = `(${Math.round(endTime)}ms || ${callTimeExecute(startTime)}ms)`;
    const info: string = contract_address.substring(contract_address.length - 6);
    console.info(`${info} => ${fromBlock}->${toBlock}: ${events.length} events ${message}`);

    // continue sync if not latest
    if (updatedContract && toBlock < blocknumber) {
      await this.excuteSync({ ...params, contract: updatedContract });
    }
  }

  /****************************************************/

  private getEvents = async ({ contract, network, ABI, acceptEvents }: ContractParams) => {
    const { blocknumber_synced, contract_address } = contract;
    const contractInst = this.etherService.getContract(network, contract_address, ABI);
    const blocknumber = await this.etherService.getBlockNumber(network);
    const nextBlock = blocknumber_synced + 1000;
    const fromBlock = blocknumber_synced - 10;
    const targetBlock = nextBlock > blocknumber ? blocknumber : nextBlock;
    const toBlock = targetBlock > fromBlock ? targetBlock : fromBlock;

    if (fromBlock > blocknumber) {
      throw new Error("fromBlock > blockNumber");
    }

    const allEvents = await contractInst.queryFilter({}, fromBlock, toBlock);
    const events = allEvents.filter((receipt) => acceptEvents.includes(receipt.event || ""));
    const eventHashes = events.map(({ transactionHash, logIndex }) => `${transactionHash.toLowerCase()}_${logIndex}`);
    return { blocknumber, fromBlock, toBlock, events, eventHashes };
  };
}
