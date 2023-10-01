import { isEmail } from "class-validator";
import { formatDecimal } from "common/utils/mongoose";

import { isAddress } from "@ethersproject/address";
import { SchemaOptions } from "@nestjs/mongoose";

export const Options: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (_, ret: any) {
      delete ret.id;
      delete ret.__v;
      ret._id = ret._id?.toString();
      return formatDecimal(ret);
    },
  },
  toObject: {
    virtuals: true,
    transform: function (_, ret: any) {
      delete ret.id;
      delete ret.__v;
      return formatDecimal(ret);
    },
  },
};

export const validateAddress = {
  validator: isAddress,
  message: "{VALUE} must be an ethereum address",
};

export const validateEmail = {
  validator: isEmail,
  message: "{VALUE} must be an email address",
};
