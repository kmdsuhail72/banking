import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LedgerEntryDocument = LedgerEntry & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class LedgerEntry {
  @Prop({ required: true, index: true })
  transactionId: string;

  @Prop({ required: true, index: true })
  accountNumber: string;

  @Prop({ required: true, enum: ['DEBIT', 'CREDIT'] })
  entryType: 'DEBIT' | 'CREDIT';

  @Prop({ required: true, min: 1 })
  amountMinor: number;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  /**
   * Running balance of the account after this entry (in minor units)
   * Populated from the account-service response during mutation
   */
  @Prop({ required: true, default: 0 })
  balanceAfterMinor: number;

  @Prop()
  description?: string;

  @Prop({ required: true })
  occurredAt: Date;
}

export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);

// Composite index for paginated queries per account
LedgerEntrySchema.index({ accountNumber: 1, occurredAt: -1 });
// Unique per transactionId + entryType to avoid double-recording
LedgerEntrySchema.index({ transactionId: 1, entryType: 1 }, { unique: true });
