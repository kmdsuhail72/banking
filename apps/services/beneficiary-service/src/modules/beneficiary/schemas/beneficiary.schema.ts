import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BeneficiaryDocument = Beneficiary & Document;

@Schema({ timestamps: true })
export class Beneficiary {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, uppercase: true })
  accountNumber: string;

  @Prop({ trim: true })
  bankName?: string;

  @Prop({ trim: true, uppercase: true })
  ifscCode?: string;

  @Prop({ trim: true })
  nickname?: string;

  @Prop({ default: false })
  isVerified: boolean;
}

export const BeneficiarySchema = SchemaFactory.createForClass(Beneficiary);

// Unique: one user cannot add the same account number twice
BeneficiarySchema.index({ userId: 1, accountNumber: 1 }, { unique: true });
