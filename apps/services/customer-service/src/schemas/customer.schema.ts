import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { KycStatus, ICustomerAddress } from "@banking/shared-types";

export type CustomerDocument = Customer & Document;

@Schema({ _id: false })
export class Address implements ICustomerAddress {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;
}

@Schema({ timestamps: true, collection: "customers" })
export class Customer {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ type: Address })
  address?: Address;

  @Prop({ default: KycStatus.PENDING, enum: KycStatus })
  kycStatus: KycStatus;

  @Prop()
  kycDocumentType?: string;

  @Prop()
  kycDocumentNumber?: string;

  @Prop({ default: 50 })
  riskScore: number;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ userId: 1 });
CustomerSchema.index({ email: 1 });
