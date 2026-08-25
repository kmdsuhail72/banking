// Banking Domain Enums
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  COMPLIANCE = 'COMPLIANCE',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CHECKING = 'CHECKING',
  WALLET = 'WALLET',
  BUSINESS = 'BUSINESS',
  LOAN = 'LOAN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  DORMANT = 'DORMANT',
  CLOSED = 'CLOSED',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_INTERNAL = 'TRANSFER_INTERNAL',
  TRANSFER_EXTERNAL = 'TRANSFER_EXTERNAL',
  PAYMENT = 'PAYMENT',
  FEE = 'FEE',
  REVERSAL = 'REVERSAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  FLAGGED_FOR_REVIEW = 'FLAGGED_FOR_REVIEW',
}

export enum KycStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethod {
  UPI = 'UPI',
  NEFT = 'NEFT',
  RTGS = 'RTGS',
  IMPS = 'IMPS',
  CARD = 'CARD',
  WALLET = 'WALLET',
}

export enum KafkaTopics {
  USER_REGISTERED = 'user.registered',
  CUSTOMER_CREATED = 'customer.created',
  ACCOUNT_CREATED = 'account.created',
  TRANSACTION_INITIATED = 'transaction.initiated',
  TRANSACTION_COMPLETED = 'transaction.completed',
  NOTIFICATION_REQUESTED = 'notification.requested',
}

// Domain Interfaces
export interface IUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ICustomer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string | Date;
  address?: ICustomerAddress;
  kycStatus: KycStatus;
  riskScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccount {
  id: string;
  customerId: string;
  accountNumber: string;
  routingNumber?: string;
  currency: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  id: string;
  referenceId: string;
  sourceAccountId: string;
  destinationAccountId?: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ILedgerEntry {
  id: string;
  transactionId: string;
  accountNumber: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  balanceAfter: number;
  createdAt: Date;
}

// Microservice Health Response
export interface IServiceHealth {
  status: 'ok' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  dependencies?: {
    mongodb?: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
    kafka?: 'connected' | 'disconnected';
  };
}

// Common Event Payloads for Kafka
export interface IBankingEvent<T = any> {
  eventId: string;
  eventType: string;
  version?: number;
  sourceService?: string;
  timestamp?: string;
  occurredAt?: string;
  correlationId?: string;
  payload: T;
}

// Phase 2 DTOs & Payloads
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  message?: string;
  user: AuthUserResponse;
  tokens?: AuthTokens;
  accessToken?: string;
  refreshToken?: string;
}

export interface RedisSessionData {
  userId: string;
  refreshTokenHash: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface CreateCustomerDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: ICustomerAddress;
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: ICustomerAddress;
}

export interface SubmitKycDto {
  documentType: 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID';
  documentNumber: string;
}

export interface IUserRegisteredPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  registeredAt: string;
}

export interface ICustomerCreatedPayload {
  customerId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  kycStatus: KycStatus;
}
