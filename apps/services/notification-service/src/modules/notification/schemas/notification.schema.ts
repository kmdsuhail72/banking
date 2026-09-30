import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NotificationDocument = Notification & Document;

export enum NotificationTypeEnum {
  TRANSACTION = "TRANSACTION",
  ACCOUNT = "ACCOUNT",
  PAYMENT = "PAYMENT",
  SECURITY = "SECURITY",
  SYSTEM = "SYSTEM",
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    required: true,
    enum: NotificationTypeEnum,
    default: NotificationTypeEnum.SYSTEM,
  })
  type: NotificationTypeEnum;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for efficient unread queries per user
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
