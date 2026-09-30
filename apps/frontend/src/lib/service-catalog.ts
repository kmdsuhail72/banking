export interface ServiceItem {
  id: string;
  name: string;
  httpPort: number;
  grpcPort: number;
  category: "core" | "payments" | "risk";
  description: string;
}

export const MICROSERVICES: ServiceItem[] = [
  {
    id: "auth",
    name: "Auth Service",
    httpPort: 4001,
    grpcPort: 50051,
    category: "core",
    description:
      "Stateless Argon2 hashing, 15-min JWT issuing & Redis token revocation",
  },
  {
    id: "customer",
    name: "Customer Service",
    httpPort: 4002,
    grpcPort: 50052,
    category: "core",
    description:
      "Profile lifecycle, multi-tenant records & Kafka user.registered consumer",
  },
  {
    id: "account",
    name: "Account Service",
    httpPort: 4003,
    grpcPort: 50053,
    category: "core",
    description:
      "Tier hierarchies, minor-unit balances & atomic MongoDB operations",
  },
  {
    id: "transaction",
    name: "Transaction Service",
    httpPort: 4004,
    grpcPort: 50054,
    category: "core",
    description:
      "Distributed idempotency keys, funds transfer & 2-phase verification",
  },
  {
    id: "ledger",
    name: "Ledger Service",
    httpPort: 4005,
    grpcPort: 50055,
    category: "payments",
    description:
      "Double-entry cryptographic ledger with immutable append-only journal",
  },
  {
    id: "payment",
    name: "Payment Service",
    httpPort: 4006,
    grpcPort: 50056,
    category: "payments",
    description:
      "ISO 20022 messaging rails, webhooks & external payment gateways",
  },
  {
    id: "wallet",
    name: "Wallet Service",
    httpPort: 4007,
    grpcPort: 50057,
    category: "payments",
    description:
      "Sub-cent stored value ledger, virtual cards & multi-currency pools",
  },
  {
    id: "beneficiary",
    name: "Beneficiary Service",
    httpPort: 4008,
    grpcPort: 50058,
    category: "payments",
    description:
      "Counterparty IBAN/SWIFT verification, payee quotas & fraud limits",
  },
  {
    id: "notification",
    name: "Notification Service",
    httpPort: 4009,
    grpcPort: 50059,
    category: "risk",
    description:
      "Async Kafka event consumer dispatching alerts, email & mobile push",
  },
  {
    id: "kyc-risk",
    name: "KYC & Risk Service",
    httpPort: 4010,
    grpcPort: 50060,
    category: "risk",
    description:
      "Real-time transaction risk scoring, sanctions checks & AML rules engine",
  },
  {
    id: "reporting",
    name: "Reporting Service",
    httpPort: 4011,
    grpcPort: 50061,
    category: "risk",
    description:
      "Streaming audit snapshots, ledger reconciliation & regulatory statements",
  },
];
