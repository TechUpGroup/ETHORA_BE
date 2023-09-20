import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { USERS_MODEL, UsersSchema } from "./schemas/users.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: USERS_MODEL, schema: UsersSchema }])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
