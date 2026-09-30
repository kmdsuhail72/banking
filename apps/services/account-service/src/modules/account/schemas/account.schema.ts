import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { AccountType, AccountStatus } from "@banking/shared-types";

export type AccountDocument = HydratedDocument<Account>;

@Schema({
  timestamps: true,
  collection: "accounts",
})
export class Account {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  accountNumber: string;

  @Prop({
    required: true,
    index: true,
  })
  userId: string;

  @Prop({
    type: String,
    required: true,
    enum: AccountType,
    default: AccountType.SAVINGS,
  })
  type: AccountType;

  @Prop({
    required: true,
    default: "INR",
  })
  currency: string;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  balanceMinor: number;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  availableBalanceMinor: number;

  @Prop({
    type: String,
    required: true,
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Indexes
AccountSchema.index({ userId: 1, type: 1 });
AccountSchema.index({ accountNumber: 1 }, { unique: true });
