import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IEventParams } from "../interfaces/helper.interface";
import { HelperService } from "./_helper.service";
import { ContractsService } from "modules/contracts/contracts.service";
import { HistoryService } from "modules/history/history.service";
import { ReferralStorage__factory, RouterAbi__factory } from "common/abis/types";
import { ContractName } from "common/constants/contract";
import { CancelTradeEvent, FailResolveEvent, FailUnlockEvent, OpenTradeEvent } from "common/abis/types/RouterAbi";
import { TradesService } from "modules/trades/trades.service";
import { JobTradeService } from "modules/_jobs/trades/job-trade.service";
import { LogsService } from "modules/logs/logs.service";
import { REASON_FAIL, REASON_FAIL_NOT_CARE, ROUTER_EVENT } from "common/constants/event";
import { TRADE_STATE } from "common/enums/trades.enum";
import { decryptAES } from "common/utils/encrypt";
import { Network } from "common/enums/network.enum";
import { EthersService } from "modules/_shared/services/ethers.service";
import config from "common/config";
import { SignerType } from "common/enums/signer.enum";
import { UsersService } from "modules/users/users.service";
import { REFERRAL_TIER } from "common/constants/referral";

@Injectable()
export class JobSyncRouterService {
  constructor(
    private readonly helperService: HelperService,
    private readonly contractService: ContractsService,
    private readonly historyService: HistoryService,
    private readonly tradeService: TradesService,
    private readonly jobTradeService: JobTradeService,
    private readonly logsService: LogsService,
    private readonly ethersService: EthersService,
    private readonly usersService: UsersService,
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
      this.ethersService.switchRPCOfJob(router.network);
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
        listBlockNumber.map((blockNumber) => this.ethersService.getBlockTime(contract.network, blockNumber)),
      );
      listBlockTime.forEach((blockTime, i) => (blocktimestamps[listBlockNumber[i]] = blockTime));

      const historyCreateArr: any[] = [];
      const bulkUpdate: any[] = [];
      const retryCloseTrades: any[] = [];

      const now = new Date();
      for (const event of events) {
        const { transactionHash, event: nameEvent, logIndex, blockNumber } = event;
        historyCreateArr.push({
          transaction_hash: transactionHash.toLowerCase().trim(),
          log_index: logIndex,
          network,
        });
        if (nameEvent === ROUTER_EVENT.OPENTRADE) {
          const { queueId, optionId, expiration, targetContract, revisedFee, account } = (event as OpenTradeEvent).args;
          bulkUpdate.push({
            updateOne: {
              filter: {
                queueId: +queueId.toString(),
              },
              update: {
                optionId: +optionId.toString(),
                expirationDate: expiration.toString(),
                contractOption: `${targetContract.toLowerCase().trim()}_${optionId.toString()}`,
                tradeSize: revisedFee.toString(),
                tx_open: transactionHash.toLowerCase().trim(),
                isLimitOrder: false,
                state: TRADE_STATE.OPENED,
                openDate: new Date(blocktimestamps[blockNumber] * 1000)
              },
            },
          });
          const index = this.jobTradeService.listActives.findIndex((a) => a.queueId === +queueId.toString());
          if (index !== -1) {
            this.jobTradeService.listActives[index]["optionId"] = +optionId.toString();
            this.jobTradeService.listActives[index]["expirationDate"] = expiration.toString();
          }

          // update tier, delay since data analytic delay
          setTimeout(() => this.updateUserTier(network, account), 10000);
        }
        if (nameEvent === ROUTER_EVENT.CANCELTRADE) {
          const { queueId, reason } = (event as CancelTradeEvent).args;
          bulkUpdate.push({
            updateOne: {
              filter: {
                queueId: +queueId.toString(),
              },
              update: {
                state: TRADE_STATE.CANCELLED,
                isCancelled: true,
                cancellationReason: REASON_FAIL[reason] || "System error",
                cancellationDate: now,
                tx_open: transactionHash.toLowerCase().trim(),
              },
            },
          });
          const index = this.jobTradeService.listActives.findIndex((a) => a.queueId === +queueId.toString());
          if(index !== -1 ) {
            this.jobTradeService.listActives.splice(index, 1);
          }
        }
        if (nameEvent === ROUTER_EVENT.FAILRESOLVE) {
          const { queueId, reason } = (event as FailResolveEvent).args;
          if (!REASON_FAIL_NOT_CARE.includes(reason)) {
            bulkUpdate.push({
              updateOne: {
                filter: {
                  queueId: +queueId.toString(),
                },
                update: {
                  state: TRADE_STATE.CANCELLED,
                  isCancelled: true,
                  cancellationReason: REASON_FAIL[reason] || "System error",
                  cancellationDate: now,
                  tx_open: transactionHash.toLowerCase().trim(),
                },
              },
            });
            const index = this.jobTradeService.listActives.findIndex((a) => a.queueId === +queueId.toString());
            if(index !== -1 ) {
              this.jobTradeService.listActives.splice(index, 1);
            }
          }
        }
        if (nameEvent === ROUTER_EVENT.FAILUNLOCK) {
          const { optionId, reason, targetContract } = (event as FailUnlockEvent).args;
          if (
            !REASON_FAIL_NOT_CARE.includes(reason) &&
            !retryCloseTrades.includes(`${targetContract.toLowerCase().trim()}_${optionId.toString()}`)
          ) {
            retryCloseTrades.push(`${targetContract.toLowerCase().trim()}_${optionId.toString()}`);
          }
        }
      }

      // retry when excuteOption close trade
      if (retryCloseTrades.length) {
        const trades = await this.tradeService.getAllTradesClosed(retryCloseTrades);
        trades
          .filter((trade) => trade.user.wallet && trade.user.wallet.privateKey)
          .forEach((trade) => {
            const _trade = {
              ...trade,
              oneCT: trade.user.oneCT,
              privateKeyOneCT: decryptAES(trade.user.wallet.privateKey as string),
            };
            if (_trade.closingTime) {
              this.jobTradeService.queueCloseAnytime.push(_trade);
            } else {
              this.jobTradeService.listActives.push(_trade);
            }
          });
      }

      // save to db
      await Promise.allSettled([
        bulkUpdate.length ? this.tradeService.bulkWrite(bulkUpdate) : undefined,
        historyCreateArr.length ? this.historyService.saveHistories(historyCreateArr) : undefined,
      ]);
    } catch (err) {
      this.logsService.createLog("JobSyncRouterService", err);
    }
  };

  private async updateUserTier(network: Network, address: string) {
    // get stats
    try {
      const { referrer } = await this.usersService.getReferralTier(address, network);
      if (referrer === "0x0000000000000000000000000000000000000000") {
        console.log("[UpgradeTier] Ignore since no referrer");
        return;
      }
      const { tier, totalTrades, totalVolumeTrades } = await this.usersService.getReferralTier(referrer, network);
      const referralConfig = REFERRAL_TIER[tier - 1];

      if (
        !referralConfig ||
        totalTrades < referralConfig.referrers ||
        Number(totalVolumeTrades) < referralConfig.totalVolume
      ) {
        console.log("[UpgradeTier] Ignore since data not match", referralConfig, totalTrades, totalVolumeTrades);
        return;
      }

      // contract
      const contract = this.ethersService.getContract(
        network,
        config.getContract(network, ContractName.REFERRAL).address,
        ReferralStorage__factory.abi,
        SignerType.operator,
      );

      // contract
      await contract.estimateGas.setReferrerTier(referrer, tier, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
      await contract.setReferrerTier(referrer, tier, {
        gasPrice: this.ethersService.getCurrentGas(network),
      });
    } catch (error) {
      console.error(error);
    }
  }
}
