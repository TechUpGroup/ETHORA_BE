import { NetworkDto } from "common/dto/network.dto";

import { Controller, Get, Param, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { ContractsService } from "./contracts.service";
import { CacheInterceptor } from "@nestjs/cache-manager";

@ApiTags("Contract")
@Controller("contract")
@UseInterceptors(CacheInterceptor)
export class ContractsController {
  constructor(private readonly contractService: ContractsService) {}

  @Get()
  async getAllContract() {
    return this.contractService.getListContract();
  }

  @Get(":network")
  async getAllContractByNetwork(@Param() { network }: NetworkDto) {
    return this.contractService.getListContract(network);
  }
}
