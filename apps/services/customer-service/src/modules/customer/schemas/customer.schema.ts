import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { KycStatus } from "@banking/shared-types";

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ _id: false })
export class CustomerAddress {
  @Prop({ trim: true })
  street?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  postalCode?: string;

  @Prop({ trim: true })
  country?: string;
}

export const CustomerAddressSchema =
  SchemaFactory.createForClass(CustomerAddress);

@Schema({
  timestamps: true,
  collection: "customers",
})
export class Customer {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  userId: string;

  @Prop({
    required: true,
    trim: true,
  })
  firstName: string;

  @Prop({
    required: true,
    trim: true,
  })
  lastName: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ type: CustomerAddressSchema })
  address?: CustomerAddress;

  @Prop({
    type: String,
    required: true,
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kycStatus: KycStatus;

  @Prop({ trim: true })
  kycDocumentType?: string;

  @Prop({ trim: true })
  kycDocumentNumber?: string;

  @Prop({
    default: 0,
  })
  riskScore: number;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
