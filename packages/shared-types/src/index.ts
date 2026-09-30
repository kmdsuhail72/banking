// Banking Domain Enums
export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SUPPORT = "SUPPORT",
  COMPLIANCE = "COMPLIANCE",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  SUSPENDED = "SUSPENDED",
}

export enum AccountType {
  SAVINGS = "SAVINGS",
  CURRENT = "CURRENT",
  SALARY = "SALARY",
}

export enum AccountStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
  CLOSED = "CLOSED",
  PENDING = "PENDING",
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  TRANSFER = "TRANSFER",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum KycStatus {
  PENDING = "PENDING",
  IN_REVIEW = "IN_REVIEW",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum PaymentMethod {
  UPI = "UPI",
  NEFT = "NEFT",
  RTGS = "RTGS",
  IMPS = "IMPS",
  CARD = "CARD",
  WALLET = "WALLET",
}

export enum KafkaTopics {
  USER_REGISTERED = "user.registered",
  CUSTOMER_CREATED = "customer.created",
  ACCOUNT_CREATED = "account.created",
  ACCOUNT_CLOSED = "account.closed",
  MONEY_DEPOSITED = "money.deposited",
  MONEY_WITHDRAWN = "money.withdrawn",
  MONEY_TRANSFERRED = "money.transferred",
  TRANSACTION_COMPLETED = "transaction.completed",
  TRANSACTION_FAILED = "transaction.failed",
  BENEFICIARY_ADDED = "beneficiary.added",
  BENEFICIARY_REMOVED = "beneficiary.removed",
  WALLET_CREDITED = "wallet.credited",
  WALLET_DEBITED = "wallet.debited",
  PAYMENT_INITIATED = "payment.initiated",
  PAYMENT_COMPLETED = "payment.completed",
  PAYMENT_FAILED = "payment.failed",
  NOTIFICATION_CREATED = "notification.created",
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
  accountNumber: string;
  userId: string;
  type: AccountType;
  currency: string;
  balanceMinor: number;
  availableBalanceMinor: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  id: string;
  transactionId: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  destinationAccountId?: string;
  description?: string;
  status: TransactionStatus;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILedgerEntry {
  id: string;
  transactionId: string;
  accountNumber: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  currency: string;
  balanceAfter: number;
  createdAt: Date;
}

// Microservice Health Response
export interface IServiceHealth {
  status: "ok" | "error";
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  dependencies?: {
    mongodb?: "connected" | "disconnected";
    redis?: "connected" | "disconnected";
    kafka?: "connected" | "disconnected";
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
  kycStatus?: KycStatus;
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: ICustomerAddress;
}

export interface SubmitKycDto {
  documentType: "PASSPORT" | "DRIVING_LICENSE" | "NATIONAL_ID";
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

// Phase 3 DTOs & Payloads
export interface CreateAccountDto {
  type: AccountType;
  currency?: string;
}

export interface UpdateAccountStatusDto {
  status: AccountStatus;
}

export interface MutateBalanceDto {
  accountId: string;
  amountMinor: number;
  operation: "CREDIT" | "DEBIT";
  description?: string;
}

export interface AccountBalanceResponse {
  accountNumber: string;
  currency: string;
  balanceMinor: number;
  availableBalanceMinor: number;
  status: AccountStatus;
}

export interface DepositDto {
  accountId: string;
  amountMinor: number;
  description?: string;
}

export interface WithdrawDto {
  accountId: string;
  amountMinor: number;
  description?: string;
}

export interface TransferDto {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: number;
  description?: string;
}

export interface QueryTransactionsDto {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  from?: string;
  to?: string;
}

export interface TransactionListResponse {
  data: ITransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IAccountCreatedPayload {
  accountId: string;
  accountNumber: string;
  userId: string;
  type: AccountType;
  currency: string;
  createdAt: string;
}

export interface IMoneyDepositedPayload {
  transactionId: string;
  accountId: string;
  accountNumber?: string;
  userId: string;
  amountMinor: number;
  currency: string;
  occurredAt: string;
}

export interface IMoneyWithdrawnPayload {
  transactionId: string;
  accountId: string;
  accountNumber?: string;
  userId: string;
  amountMinor: number;
  currency: string;
  occurredAt: string;
}

export interface IMoneyTransferredPayload {
  transactionId: string;
  sourceAccountId: string;
  sourceAccountNumber?: string;
  destinationAccountId: string;
  destinationAccountNumber?: string;
  userId: string;
  amountMinor: number;
  currency: string;
  occurredAt: string;
}

// ─── Beneficiary ────────────────────────────────────────────────────────────

export interface IBeneficiary {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  bankName?: string;
  ifscCode?: string;
  nickname?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBeneficiaryDto {
  name: string;
  accountNumber: string;
  bankName?: string;
  ifscCode?: string;
  nickname?: string;
}

export interface UpdateBeneficiaryDto {
  nickname?: string;
  bankName?: string;
  ifscCode?: string;
}

export interface IBeneficiaryAddedPayload {
  beneficiaryId: string;
  userId: string;
  accountNumber: string;
  name: string;
  addedAt: string;
}

export interface IBeneficiaryRemovedPayload {
  beneficiaryId: string;
  userId: string;
  accountNumber: string;
  removedAt: string;
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

export enum WalletStatus {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  CLOSED = "CLOSED",
}

export interface IWallet {
  id: string;
  userId: string;
  balanceMinor: number;
  currency: string;
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTopUpDto {
  amountMinor: number;
  description?: string;
}

export interface WalletSpendDto {
  amountMinor: number;
  description?: string;
}

export interface IWalletCreditedPayload {
  walletId: string;
  userId: string;
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  occurredAt: string;
}

export interface IWalletDebitedPayload {
  walletId: string;
  userId: string;
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  occurredAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export interface IPayment {
  id: string;
  paymentId: string;
  userId: string;
  method: PaymentMethod;
  amountMinor: number;
  currency: string;
  fromAccountId: string;
  toAccountId?: string;
  upiId?: string;
  reference?: string;
  description?: string;
  status: PaymentStatus;
  failureReason?: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiatePaymentDto {
  method: PaymentMethod;
  amountMinor: number;
  fromAccountId: string;
  toAccountId?: string;
  upiId?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface IPaymentInitiatedPayload {
  paymentId: string;
  userId: string;
  method: PaymentMethod;
  amountMinor: number;
  currency: string;
  fromAccountId: string;
  toAccountId?: string;
  initiatedAt: string;
}

export interface IPaymentCompletedPayload {
  paymentId: string;
  userId: string;
  method: PaymentMethod;
  amountMinor: number;
  currency: string;
  completedAt: string;
}

export interface IPaymentFailedPayload {
  paymentId: string;
  userId: string;
  amountMinor: number;
  failureReason: string;
  failedAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export enum NotificationType {
  TRANSACTION = "TRANSACTION",
  ACCOUNT = "ACCOUNT",
  PAYMENT = "PAYMENT",
  SECURITY = "SECURITY",
  SYSTEM = "SYSTEM",
}

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}
