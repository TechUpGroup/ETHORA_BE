import { Event } from "@ethersproject/contracts";

export interface IEventParams {
  events: Event[];
  contract: any;
  eventHashes: string[];
}

export interface ContractParams {
  contract: any;
  ABI: any;
  acceptEvents: string[];
  callback: HandleFunc;
}

export interface HandleFunc {
  (input: IEventParams): Promise<void>;
}
