# Architecture Overview

The **Cloud Banking Platform** is an enterprise-grade cloud-native banking platform architected as a distributed microservices ecosystem.

```text
                         ┌───────────────┐
                         │   Next.js     │
                         │    React      │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  API Gateway  │
                         │   (NestJS)    │
                         └───────┬───────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   Auth Service            Customer Service        Account Service
   (Port: 4001)             (Port: 4002)            (Port: 4003)
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                         ┌───────┴────────┐
                         │                │
                         ▼                ▼
                      MongoDB           Redis
                         │
                         │
                         ▼
                       Kafka
```

## Microservices Catalog (11 Services)

| Service | HTTP Port | gRPC Port | Responsibility |
| :--- | :--- | :--- | :--- |
| **API Gateway** | 3000 | - | Reverse proxy, rate limiting, routing |
| **Auth Service** | 4001 | 50051 | Authentication, JWT, Redis session caching |
| **Customer Service** | 4002 | 50052 | Customer profiles, personal data, KYC tracking |
| **Account Service** | 4003 | 50053 | Accounts, tiers, balances, account lifecycle |
| **Transaction Service**| 4004 | 50054 | Transaction processing, validation, idempotency |
| **Ledger Service** | 4005 | 50055 | Double-entry bookkeeping, audit ledger |
| **Payment Service** | 4006 | 50056 | External payment gateways, rails (UPI, NEFT, IMPS) |
| **Wallet Service** | 4007 | 50057 | Digital wallet & stored-value management |
| **Beneficiary Service**| 4008 | 50058 | Payee contacts, favorite accounts, whitelists |
| **Notification Service**|4009 | 50059 | Asynchronous event notifications (SMS/Email) |
| **KYC Risk Service** | 4010 | 50060 | Anti-Money Laundering (AML), fraud detection |
| **Reporting Service** | 4011 | 50061 | Financial reporting, statement generation |
