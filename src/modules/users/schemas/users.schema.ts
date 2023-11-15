import { Options, validateAddress } from "common/config/mongoose.config";
import { Document, SchemaTypes, Types, Schema as SchemaMongoDB } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Network } from "common/enums/network.enum";
import { Exclude } from "class-transformer";

export const USERS_MODEL = "users";
export const USER_INFOS_MODEL = "user_infos";
export const WALLETS_MODEL = "wallets";

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

  @Prop({ required: false })
  referralCode: string;

  @Prop({ required: false })
  @Exclude()
  mnemonic: string;

  @Prop({ required: false, index: true, trim: true, lowercase: true, validate: validateAddress, unique: true })
  oneCT: string;

  @Prop({ required: true, default: uuidv4 })
  nonce: string;

  @Prop({ required: true, default: false })
  banned: boolean;

  @Prop({ required: true, default: false })
  faucet: boolean;
}

export type UsersDocument = Users & Document;
export const UsersSchema = SchemaFactory.createForClass(Users);

@Schema(Options)
export class Wallets {
  @Prop({ required: true, index: true, type: Types.ObjectId, ref: USERS_MODEL })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true, trim: true, lowercase: true, validate: validateAddress, unique: true })
  address: string;

  @Prop({ required: true, index: true, trim: true, unique: true })
  @Exclude()
  privateKey: string;

  @Prop({ required: true, enum: Network, default: Network.base })
  network: Network;

  @Prop({ required: false, type: SchemaTypes.Decimal128, index: true, min: 0 })
  balance: Types.Decimal128;

  @Prop({ required: false, default: false })
  isRegistered: boolean;

  @Prop({ required: false, default: true })
  isShouldRegistered: boolean;

  @Prop({ required: false, default: "" })
  registerSignature: string;

  @Prop({ required: false, default: false })
  isApproved: boolean;

  @Prop({ required: false, default: true })
  isShouldApproved: boolean;

  @Prop({ required: false, default: "" })
  approveSignature: string;

  @Prop({ type: Date, required: false, default: null })
  lastApproveDate: Date | null;

  @Prop({ type: Date, required: false, default: null })
  lastRevokeDate: Date | null;

  @Prop({ required: false, default: null })
  permit: SchemaMongoDB.Types.Mixed;
}

export type WalletsDocument = Wallets & Document;
export const WalletsSchema = SchemaFactory.createForClass(Wallets);
