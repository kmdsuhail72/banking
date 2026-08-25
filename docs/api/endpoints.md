# API Gateway Route Specification

The API Gateway routes client traffic via `/api/v1/`:

- `/api/v1/auth/*` → `auth-service`
- `/api/v1/customers/*` → `customer-service`
- `/api/v1/accounts/*` → `account-service`
- `/api/v1/transactions/*` → `transaction-service`
- `/api/v1/ledger/*` → `ledger-service`
- `/api/v1/payments/*` → `payment-service`
- `/api/v1/wallet/*` → `wallet-service`
- `/api/v1/beneficiaries/*` → `beneficiary-service`
- `/api/v1/notifications/*` → `notification-service`
- `/api/v1/kyc/*` → `kyc-risk-service`
- `/api/v1/reports/*` → `reporting-service`

All services expose `GET /health` returning standard `IServiceHealth`.
