import { Options, validateAddress } from "common/config/mongoose.config";
import { Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const USERS_MODEL = "users";

@Schema(Options)
export class Users {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: validateAddress,
  })
  address: string;

  @Prop({ required: true, default: uuidv4 })
  nonce: string;

  @Prop({ required: true, default: false })
  banned: boolean;

  @Prop({ required: true, default: false })
  faucet: boolean;
}

export type UsersDocument = Users & Document;

export const UsersSchema = SchemaFactory.createForClass(Users);
