import { Module } from "@nestjs/common";
import { PricesController } from "./price.controller";


@Module({
  imports: [],
  controllers: [PricesController],
  providers: [],
  exports: [],
})
export class PricesModule {}
