import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@banking/database';
import { UserRole, UserStatus } from '@banking/shared-types';

/**
 * PostgreSQL replacement for the Mongoose User schema.
 * Table prefix: auth_
 */
@Entity({ name: 'auth_users' })
export class UserEntity extends BaseEntity {
  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, length: 255 })
  verificationToken: string | null;

  @Column({ nullable: true, length: 255 })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ nullable: true, length: 255 })
  currentRefreshTokenHash: string | null;
}
