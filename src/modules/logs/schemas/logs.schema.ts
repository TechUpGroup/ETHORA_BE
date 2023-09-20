import { Options } from "common/config/mongoose.config";
import { Document } from "mongoose";

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export const LOGS_MODEL = "logs";

@Schema(Options)
export class Logs {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  note?: string;
}

export type LogsDocument = Logs & Document;
export const LogsSchema = SchemaFactory.createForClass(Logs);
