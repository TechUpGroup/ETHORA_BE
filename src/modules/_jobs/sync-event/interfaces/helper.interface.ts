import { Event } from "@ethersproject/contracts";
import { Network } from "common/enums/network.enum";

export interface IEventParams {
  events: Event[];
  contract: any;
  eventHashes: string[];
}

export interface ContractParams {
  contract: any;
  network: Network;
  ABI: any;
  acceptEvents: string[];
  callback: HandleFunc;
}

export interface HandleFunc {
  (input: IEventParams): Promise<void>;
}
