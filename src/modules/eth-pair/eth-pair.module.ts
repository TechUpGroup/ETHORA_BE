import { Module } from "@nestjs/common";
import { EthPairsService } from "./eth-pair.service";
import { ETH_PAIR_MODEL, EthPairSchema } from "./schema/eth-pair.schema";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ETH_PAIR_MODEL, schema: EthPairSchema}]),
  ],
  providers: [EthPairsService],
  exports: [EthPairsService],
})
export class EthPairsModule {}
