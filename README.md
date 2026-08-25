# Cloud Banking Platform

> Enterprise Cloud-Native Banking Microservices Platform built with Next.js, NestJS, MongoDB, Redis, and Apache Kafka.

---

## 🏗️ Architecture & Monorepo Structure

```text
cloud-banking-platform/
│
├── apps/
│   ├── frontend/            # Next.js 15 (React 19 + TypeScript + Tailwind CSS)
│   ├── api-gateway/         # NestJS API Gateway (Reverse Proxy & Rate Limiting)
│   └── services/            # 11 Dedicated NestJS Microservices
│       ├── auth-service/
│       ├── customer-service/
│       ├── account-service/
│       ├── transaction-service/
│       ├── ledger-service/
│       ├── payment-service/
│       ├── wallet-service/
│       ├── beneficiary-service/
│       ├── notification-service/
│       ├── kyc-risk-service/
│       └── reporting-service/
│
├── packages/                # Shared Internal TypeScript Packages
│   ├── config/              # Centralized environment & app configuration
│   ├── logger/              # Structured JSON logging utility
│   ├── shared-types/        # Domain interfaces, enums, DTOs & event types
│   ├── kafka/               # Standardized Kafka EventBus publisher & subscriber
│   ├── grpc/                # gRPC service definitions & port catalog
│   └── observability/       # Health checks & OpenTelemetry tracing helpers
│
├── infrastructure/          # Local Docker & Cloud Infrastructure manifests
│   ├── mongodb/
│   ├── redis/
│   └── kafka/
│
├── docs/                    # Architecture, API specifications & guides
│   ├── architecture/
│   ├── api/
│   └── development/
│
├── .github/workflows/       # GitHub Actions CI/CD workflows
├── docker-compose.yml       # Local infrastructure (MongoDB 8, Redis 8, Kafka)
├── pnpm-workspace.yaml      # Monorepo workspace configuration
├── package.json
└── tsconfig.json
```

---

## 🚀 Microservice Port Catalog

| Service | HTTP Port | gRPC Port | Status |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `3000` | - | Ready |
| **Frontend (Next.js)** | `3001` | - | Ready |
| **Auth Service** | `4001` | `50051` | Ready |
| **Customer Service** | `4002` | `50052` | Ready |
| **Account Service** | `4003` | `50053` | Ready |
| **Transaction Service** | `4004` | `50054` | Ready |
| **Ledger Service** | `4005` | `50055` | Ready |
| **Payment Service** | `4006` | `50056` | Ready |
| **Wallet Service** | `4007` | `50057` | Ready |
| **Beneficiary Service** | `4008` | `50058` | Ready |
| **Notification Service** | `4009` | `50059` | Ready |
| **KYC Risk Service** | `4010` | `50060` | Ready |
| **Reporting Service** | `4011` | `50061` | Ready |

---

## ⚡ Quick Start

```powershell
# 1. Install dependencies across workspace
pnpm install

# 2. Build shared packages
pnpm build

# 3. Start infrastructure (MongoDB, Redis, Kafka)
docker compose up -d

# 4. Run development servers
pnpm dev
```
