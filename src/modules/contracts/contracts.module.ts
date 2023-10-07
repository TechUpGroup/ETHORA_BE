import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { CONTRACTS_MODEL, ContractsSchema } from "./schemas/contracts.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CONTRACTS_MODEL, schema: ContractsSchema }])
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
