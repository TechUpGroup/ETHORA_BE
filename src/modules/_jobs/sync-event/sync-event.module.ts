import { Module } from "@nestjs/common";
import { ContractsModule } from "modules/contracts/contracts.module";

@Module({
  imports: [ContractsModule],
  providers: [],
})
export class SyncEventModule {}
