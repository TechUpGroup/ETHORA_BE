import { Options } from "common/config/mongoose.config";
import { USERS_MODEL } from "modules/users/schemas/users.schema";
import { Document, SchemaTypes } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { TokenTypes } from "../constants/token.constant";

export const TOKENS_MODEL = "tokens";
@Schema(Options)
export class Tokens {
  @Prop({ required: true, index: true })
  token: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: USERS_MODEL })
  user: string;

  @Prop({ required: true, enum: TokenTypes })
  type: string;

  @Prop({ required: true })
  expires: Date;

  @Prop({ required: true, default: false })
  blacklisted?: boolean;
}

export type TokensDocument = Tokens & Document;

export const TokensSchema = SchemaFactory.createForClass(Tokens);
