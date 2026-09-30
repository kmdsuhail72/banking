import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { UserRole, UserStatus } from "@banking/shared-types";

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: "users",
})
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  passwordHash: string;

  @Prop({
    type: String,
    required: true,
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Prop({
    type: String,
    required: true,
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Prop({
    default: false,
  })
  emailVerified: boolean;

  @Prop()
  emailVerificationTokenHash?: string;

  @Prop()
  passwordResetTokenHash?: string;

  @Prop()
  passwordResetExpiresAt?: Date;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
