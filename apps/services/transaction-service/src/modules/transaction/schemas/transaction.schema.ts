import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { TransactionType, TransactionStatus } from "@banking/shared-types";

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({
  timestamps: true,
  collection: "transactions",
})
export class Transaction {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  transactionId: string;

  @Prop({
    required: true,
    index: true,
  })
  userId: string;

  @Prop({
    required: true,
    index: true,
  })
  accountId: string;

  @Prop({
    type: String,
    required: true,
    enum: TransactionType,
  })
  type: TransactionType;

  @Prop({
    required: true,
    min: 1,
  })
  amountMinor: number;

  @Prop({
    required: true,
    default: "INR",
  })
  currency: string;

  @Prop()
  destinationAccountId?: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    required: true,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    index: true,
  })
  status: TransactionStatus;

  @Prop({
    required: true,
    index: true,
  })
  idempotencyKey: string;

  @Prop()
  failureReason?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ accountId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, idempotencyKey: 1 });
