# Local runtime verification — 5 October 2026

Website: http://localhost:3001
Grafana: http://localhost:13001 (use your configured local credentials)
Prometheus: http://localhost:9090

## Verified

- Home, login, dashboard, accounts, transfer, deposit, withdrawal, transactions, and profile pages returned HTTP 200. Browser automation was unavailable, so visual rendering and UI interactions were not verified.
- Grafana, Prometheus, Alertmanager, Loki, Tempo, and the OpenTelemetry collector passed readiness checks. Grafana successfully queried its Prometheus datasource; eight dashboards were provisioned.
- API gateway and auth, customer, account, transaction, payment, wallet, ledger, and notification services returned HTTP 200 from /health. Dependency labels in these handlers are hard-coded and do not independently prove connectivity.
- Prometheus: 12 of 15 scrape targets up; three down.
- Synthetic local registration returned 201, login 200, and authenticated profile retrieval 200. One synthetic smoke-test user remains in the local database.
- Invalid login returned 401; invalid registration returned 400.
- Shared database and gRPC packages built successfully. Standalone backend monitoring tests: 14 passed, 1 integration test skipped, 0 failed. These tests do not cover all NestJS banking workflows.

## Unresolved application issues

- Beneficiary, KYC risk, and reporting cannot start: `beneficiary.proto`, `kyc-risk.proto`, and `reporting.proto` are missing from `packages/grpc/proto`.
- Authenticated `/api/v1/accounts` and `/api/v1/transactions` returned 404. Several service AppModules still contain TODO domain-module imports. Website demo data does not prove these backend features work.
- Service-down and SLO alerts were pending. SLO probes call protected endpoints without a configured probe token.
- Website observability status expects Jaeger, while this Compose stack runs Tempo.
- Local Alertmanager now routes critical alerts to the incident-management service. It does not deliver Slack/email notifications.

## Startup repairs

- Moved Grafana to 13001 to avoid the website's 3001 port; updated monitoring helper URLs.
- Fixed unsupported collector labels, an invalid filter expression, and a duplicate spanmetrics dimension.
- Enabled Prometheus native histograms for Tempo remote writes and exposed collector metrics on 8889.
- Aligned the shared database package with NestJS 10; moved the outbox decorator import before its use and rebuilt.
- Restored the Mongoose root connection needed by the existing auth module.
- Added configurable gRPC ports and used 55051–55061 to avoid Windows reserved ports.
- Started PostgreSQL locally on 15432 because binding 5432 failed.

## Restart

With Docker Desktop running:

```powershell
docker compose -f docker-compose.yml -f docker-compose.observability.yml -f docker-compose.incidents.yml up -d
docker start banking-postgres-local
.\scripts\start-local-apps.ps1
```

The PostgreSQL container is bound to loopback on port 15432. The failed, never-started `banking-postgres` container also remains. No existing volumes were deleted.

## Incident dashboard follow-up

Started the incident-management Compose overlay and its dedicated MongoDB. Prometheus now scrapes the authenticated banking-incidents target (up = 1), and Alertmanager routes critical alerts to the service. All four dashboard queries returned numeric data; initial incident totals and webhook rate were zero. Grafana proxy verification could not be repeated because the previous local credentials now return 401; no credentials were changed. Initialized the webhook counter at zero so an unused receiver exports a series. Use all three Compose files in the restart command above to retain the incident integration.
