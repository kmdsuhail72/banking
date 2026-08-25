export interface IGrpcClientOptions {
  url: string;
  package: string;
  protoPath: string;
}

export const GRPC_PACKAGES = {
  AUTH: 'banking.auth',
  CUSTOMER: 'banking.customer',
  ACCOUNT: 'banking.account',
  TRANSACTION: 'banking.transaction',
  LEDGER: 'banking.ledger',
  PAYMENT: 'banking.payment',
  WALLET: 'banking.wallet',
  BENEFICIARY: 'banking.beneficiary',
  NOTIFICATION: 'banking.notification',
  KYC_RISK: 'banking.kyc_risk',
  REPORTING: 'banking.reporting',
} as const;

export const DEFAULT_GRPC_PORTS = {
  AUTH: 50051,
  CUSTOMER: 50052,
  ACCOUNT: 50053,
  TRANSACTION: 50054,
  LEDGER: 50055,
  PAYMENT: 50056,
  WALLET: 50057,
  BENEFICIARY: 50058,
  NOTIFICATION: 50059,
  KYC_RISK: 50060,
  REPORTING: 50061,
} as const;
