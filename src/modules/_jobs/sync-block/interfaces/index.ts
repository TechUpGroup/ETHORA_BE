
import { Log } from "@ethersproject/abstract-provider";
import { Network } from "common/enums/network.enum";

export interface IHandleLogs {
  logs: Log[];
  blocktimestamps: { [key: string]: number };
  network: Network;
}
