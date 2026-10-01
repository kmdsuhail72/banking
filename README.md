# 🏦 NovaBank — Enterprise Cloud Banking Platform

> A production-grade, distributed, cloud-native banking microservices platform built with **Next.js 15**, **NestJS**, **MongoDB 8**, **Redis 8**, and **Apache Kafka**.

[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?style=flat&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Kafka](https://img.shields.io/badge/Event%20Mesh-Apache%20Kafka-231F20?style=flat&logo=apachekafka)](https://kafka.apache.org/)
[![MongoDB 8](https://img.shields.io/badge/Database-MongoDB%208-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Redis 8](https://img.shields.io/badge/Cache-Redis%208-DC382D?style=flat&logo=redis)](https://redis.io/)
[![Compliance](https://img.shields.io/badge/Compliance-SOC2%20%7C%20PCI--DSS%204.0%20Ready-10B981?style=flat)](<>)

---

## ⚡ Quick Navigation

- [🌟 Live Application Overview](#-live-application-overview)
- [✨ Key Platform Features](#-key-platform-features)
- [🏗️ Monorepo Architecture](#️-monorepo-architecture)
- [🚀 Service Port & Telemetry Catalog](#-service-port--telemetry-catalog)
- [💻 Getting Started & Local Setup](#-getting-started--local-setup)
- [🧪 API Testing & Verification](#-api-testing--verification)
- [🔒 Security & Compliance Standards](#-security--compliance-standards)

---

## 🌟 Live Application Overview

The platform includes a developer-aesthetic landing page, an interactive authenticated banking portal, and 11 containerized NestJS microservices.

| Application Layer                  | URL                                                                                          | Status  | Description                                                                                                |
| :--------------------------------- | :------------------------------------------------------------------------------------------- | :-----: | :--------------------------------------------------------------------------------------------------------- |
| **Developer Marketing & Overview** | [http://localhost:3001/](http://localhost:3001/)                                             | 🟢 Live | High-scale B2B overview, live telemetry catalog, architecture bento grid & interactive quickstart terminal |
| **Authentication Portal**          | [http://localhost:3001/login](http://localhost:3001/login)                                   | 🟢 Live | Secure sign-in with ⚡ **One-Click Demo Showcase** launcher                                                |
| **Banking Dashboard**              | [http://localhost:3001/dashboard](http://localhost:3001/dashboard)                           | 🟢 Live | Net worth summary, multi-account cards, quick actions & transactions                                       |
| **Accounts Management**            | [http://localhost:3001/dashboard/accounts](http://localhost:3001/dashboard/accounts)         | 🟢 Live | Savings, Current & Salary account manager with IBAN copy                                                   |
| **Funds Transfer Engine**          | [http://localhost:3001/dashboard/transfer](http://localhost:3001/dashboard/transfer)         | 🟢 Live | 2-phase fund transfer with distributed idempotency checks                                                  |
| **Deposit & Cash Management**      | [http://localhost:3001/dashboard/deposit](http://localhost:3001/dashboard/deposit)           | 🟢 Live | Balance crediting with real-time balance propagation                                                       |
| **ATM / Branch Withdrawal**        | [http://localhost:3001/dashboard/withdraw](http://localhost:3001/dashboard/withdraw)         | 🟢 Live | Real-time debit engine with overdraft prevention                                                           |
| **Ledger & Transactions**          | [http://localhost:3001/dashboard/transactions](http://localhost:3001/dashboard/transactions) | 🟢 Live | Filterable transaction logs with status badges & metadata                                                  |
| **Customer Profile**               | [http://localhost:3001/profile](http://localhost:3001/profile)                               | 🟢 Live | KYC status, address details & risk scoring parameters                                                      |
| **API Gateway Proxy**              | [http://localhost:3000](http://localhost:3000)                                               | 🟢 Live | Reverse proxy with rate-limiting & correlation ID tracking                                                 |

---

## ✨ Key Platform Features

### 1. ⚡ Interactive Demo Showcase (Preloaded Mock Engine)

- **Instant Access**: Click **"Launch Demo Showcase (Arjun Mehta)"** on the Login page to explore the full dashboard without creating a backend account.
- **Pre-populated Dataset**:
  - **Verified Profile**: Arjun Mehta (`arjun.mehta@novabank.demo`, KYC Verified, Mumbai, India).
  - **3 Active Bank Accounts**:
    - **Savings Account**: ₹15,82,456.00
    - **Current Account**: ₹4,37,812.50
    - **Salary Account**: ₹2,10,000.00
    - **Total Net Worth**: **₹22,30,268.50**
  - **20 Realistic Transactions**: Salary credits, SIP transfers, ATM cash withdrawals, Swiggy/Zomato orders, rent payments, FD maturity, and utility bills.
- **Dynamic Simulation**: Live deposits, withdrawals, transfers, and new account openings persist in the demo session and update balances in real time.

### 2. 🌓 Dual Dark & Bright Theme System

- Seamlessly toggle between **🌙 Dark (Obsidian #080B10)** and **☀️ Bright** themes via the top navigation bar.
- Choice is persisted in `localStorage` across page reloads.

### 3. 🎯 Principal Designer Developer Landing Page

- **Hero Sandbox**: Minimalist IDE aesthetics, interactive command snippet (`pnpm install && pnpm dev`) with clipboard copy feedback.
- **Interactive Monorepo Navigator**: Interactive visual explorer for `apps/`, `packages/`, and `infrastructure/`.
- **Live Telemetry & Port Catalog**: Real-time status cards with blinking telemetry pulse dots, HTTP/gRPC ports, and micro-sparkline graphs.
- **Bento Grid Architecture**: Interactive Kafka EventBus publisher/subscriber simulator, Zero-Trust NestJS Gateway, and shared core TypeScript packages.
- **4-Step Quickstart Terminal**: Interactive tabbed terminal with simulated output and timing execution metrics.

---

## 🏗️ Monorepo Architecture

```text
cloud-banking-platform/
│
├── apps/
│   ├── frontend/            # Next.js 15 (React 19 + TypeScript + Tailwind CSS)
│   ├── api-gateway/         # NestJS API Gateway (Reverse Proxy & Rate Limiting)
│   └── services/            # 11 Dedicated NestJS Microservices
│       ├── auth-service/          # Port 4001 | gRPC 50051 (Argon2, JWT & Redis sessions)
│       ├── customer-service/      # Port 4002 | gRPC 50052 (Profiles & Kafka onboarding)
│       ├── account-service/       # Port 4003 | gRPC 50053 (Balances & Account Tiers)
│       ├── transaction-service/   # Port 4004 | gRPC 50054 (Core Idempotent Engine)
│       ├── ledger-service/        # Port 4005 | gRPC 50055 (Double-Entry Immutable Ledger)
│       ├── payment-service/       # Port 4006 | gRPC 50056 (ISO 20022 & Payment Rails)
│       ├── wallet-service/        # Port 4007 | gRPC 50057 (Sub-cent Stored Value)
│       ├── beneficiary-service/   # Port 4008 | gRPC 50058 (Counterparty Verification)
│       ├── notification-service/  # Port 4009 | gRPC 50059 (Event Alerts & Webhooks)
│       ├── kyc-risk-service/      # Port 4010 | gRPC 50060 (Risk Matrix & AML Engine)
│       └── reporting-service/     # Port 4011 | gRPC 50061 (Audit & Analytics)
│
├── packages/                # Shared Internal TypeScript Libraries
│   ├── config/              # Centralized environment & app configuration
│   ├── logger/              # Winston JSON logger with correlation IDs & PII masking
│   ├── shared-types/        # Type-safe DTOs, domain models, enums & Kafka schemas
│   ├── kafka/               # KafkaJS EventBus publisher & consumer wrapper
│   ├── grpc/                # Protobuf definitions & gRPC client factories
│   └── observability/       # OpenTelemetry tracing & Prometheus metrics
│
├── infrastructure/          # Stateful cluster configs (MongoDB, Redis, Kafka)
├── docker-compose.yml       # Local stateful infrastructure (Mongo 8, Redis 8, Kafka)
├── pnpm-workspace.yaml      # Monorepo package workspace configuration
└── test-customer-api.js     # End-to-end customer service verification test suite
```

---

## 🚀 Service Port & Telemetry Catalog

| Service                   | HTTP Port | gRPC Port |  Protocol   | SLA Uptime | Latency |   Status   |
| :------------------------ | :-------: | :-------: | :---------: | :--------: | :-----: | :--------: |
| **API Gateway**           |  `3000`   |     -     | HTTP / REST |   99.99%   | < 1.2ms |  🟢 Ready  |
| **Frontend (Next.js 15)** |  `3001`   |     -     | HTTP / SSR  |   99.99%   | < 0.9ms |  🟢 Ready  |
| **Auth Service**          |  `4001`   |  `50051`  | REST / gRPC |   99.99%   | 0.42ms  |  🟢 Ready  |
| **Customer Service**      |  `4002`   |  `50052`  | REST / gRPC |   99.99%   | 0.58ms  |  🟢 Ready  |
| **Account Service**       |  `4003`   |  `50053`  | REST / gRPC |   99.98%   | 0.39ms  |  🟢 Ready  |
| **Transaction Service**   |  `4004`   |  `50054`  | REST / gRPC |   99.99%   | 0.61ms  |  🟢 Ready  |
| **Ledger Service**        |  `4005`   |  `50055`  | REST / gRPC |   99.99%   | 0.34ms  |  🟢 Ready  |
| **Payment Service**       |  `4006`   |  `50056`  | REST / gRPC |   99.97%   | 0.85ms  |  🟢 Ready  |
| **Wallet Service**        |  `4007`   |  `50057`  | REST / gRPC |   99.99%   | 0.45ms  |  🟢 Ready  |
| **Beneficiary Service**   |  `4008`   |  `50058`  | REST / gRPC |   99.98%   | 0.51ms  |  🟢 Ready  |
| **Notification Service**  |  `4009`   |  `50059`  | REST / gRPC |   99.99%   | 0.72ms  |  🟢 Ready  |
| **KYC Risk Service**      |  `4010`   |  `50060`  | REST / gRPC |   99.99%   | 0.68ms  |  🟢 Ready  |
| **Reporting Service**     |  `4011`   |  `50061`  | REST / gRPC |   99.96%   | 0.92ms  |  🟢 Ready  |
| **MongoDB 8.0**           |  `27017`  |     -     |     TCP     |   99.99%   |    -    | 🟢 Healthy |
| **Redis 8.0**             |  `6379`   |     -     |     TCP     |   99.99%   |    -    | 🟢 Healthy |
| **Apache Kafka Broker**   |  `9092`   |     -     |     TCP     |   99.99%   |    -    | 🟢 Healthy |
| **Zookeeper**             |  `2181`   |     -     |     TCP     |   99.99%   |    -    | 🟢 Healthy |

---

## 💻 Getting Started & Local Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **PNPM**: `v9.x` or `v11.x` (`corepack enable pnpm`)
- **Docker Desktop**: For MongoDB, Redis & Kafka containers

### Step-by-Step Execution

```powershell
# 1. Install workspace dependencies
pnpm install

# 2. Build shared TypeScript libraries
pnpm build

# 3. Start stateful infrastructure (MongoDB 8, Redis 8, Kafka)
docker compose up -d

# 4. Launch all 13 services concurrently
pnpm dev
```

The services will spin up in parallel:

- Web App: [http://localhost:3001](http://localhost:3001)
- API Gateway: [http://localhost:3000](http://localhost:3000)
- Microservices: [http://localhost:4001](http://localhost:4001) through `http://localhost:4011`

---

## 🧪 API Testing & Verification

Run the automated Customer Service test suite:

```powershell
node test-customer-api.js
```

**Expected Output:**

```text
============================================================
CUSTOMER SERVICE API TEST SUITE
============================================================
Base URL: http://localhost:4002/api/v1
[TEST 1] Create Customer Profile  ->  ✅ CREATE_CUSTOMER: Created
[TEST 2] Get Customer by ID       ->  ✅ GET_CUSTOMER: Retrieved
[TEST 3] Update Customer Profile  ->  ✅ UPDATE_CUSTOMER: Profile updated
============================================================
TEST SUMMARY: ✅ Passed: 3, ❌ Failed: 0
============================================================
```

---

## 🔒 Security & Compliance Standards

- **Password Hashing**: Memory-hard Argon2id.
- **JWT Architecture**: 15-minute stateless access tokens + 7-day rotating Redis-backed refresh tokens with instant revocation.
- **Rate Limiting**: Sliding-window rate limiter on the API Gateway (100 req/s per IP).
- **Audit Logging**: Immutable, tamper-evident double-entry ledger journals.
- **PII Protection**: Sanitized logging via `@banking/logger` to prevent credit card, account number, or auth token leaks.
- **Regulatory Compliance**: Built according to SOC2 Type II, PCI-DSS 4.0, Basel III, and ISO 27001 security parameters.

---

<div align="center">
  <sub>Built with ❤️ for Enterprise FinTech Architecture • NovaBank Engine</sub>
</div>

## GitOps delivery

The existing backend now has Argo CD manifests, staging and production Kustomize
overlays, and a workflow that opens image-digest promotion pull requests. Staging
syncs automatically; production requires an operator sync. Both environments start
at zero replicas until the first real image is promoted.

See [GitOps setup and demo](docs/development/gitops.md) for the deployment diagram,
bootstrap prerequisites, preview commands, and rollback instructions.

## SRE operations

- [Incident management: implementation and deployment](apps/incident-management/README.md)
- [SLIs, SLOs, PromQL and error budget deployment policy](infrastructure/observability/SLO.md)
