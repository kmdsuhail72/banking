# Banking SLIs, SLOs and error budgets

These are illustrative internal reliability objectives, not contractual SLAs. Product, banking operations and SRE must ratify them against measured traffic, dependency contracts and customer impact. Evaluate rolling **30-day** windows, separately per service; do not average instance percentiles or pool unrelated services. Prometheus retention is 35 days. The dashboard is `Banking SLOs and error budgets` (`/d/banking-slo`).

| Indicator | Definition and illustrative target | Assumptions |
|---|---|---|
| Critical API availability | Successful external authenticated GET probes / completed probes, **99.9%** per critical API | Redundant infrastructure, 24x7 access, no maintenance exclusions. About 10–15 second sampling, 5 second deadline, expected HTTP 200 and response marker. Sample-weighted approximation of time availability; not a guarantee that all business operations work. |
| Request success | Nontechnical HTTP outcomes / all gateway requests, **99.9%** | Gateway is the customer boundary; do not also count internal hops. Expected 4xx responses are technically served. Health and metrics excluded. |
| API latency p50/p95/p99 | Gateway elapsed time including aborted responses; p50 diagnostic, **p95 below 300 ms**, **p99 below 1 s** | Synchronous interactive requests, local-region clients/dependencies; long-running reports and external settlement need separate objectives. Exact histogram thresholds operationalize these as >=95% at or below 0.3s and >=99% at or below 1s; quantile charts are interpolated estimates, and bucket boundaries are inclusive. |
| Transaction success | Completed attempts / (completed attempts + technical failures), **99.95%** | Successful idempotency replays and valid business rejections excluded. Higher objective reflects money movement importance. Current metric measures synchronous deposit/withdraw/transfer attempts, not audited exactly-once ledger settlement. |
| Database query latency | <=100 ms queries / all instrumented queries, **95%**, plus p95 chart | Initial internal diagnostic target, leaving time in the API budget for application/network work. Includes failures, measures query-runner execution; pool checkout before runner calls and legacy MongoDB queries are not covered. |
| Authentication success | Successful login / (successful login + technical failure), **99.9%** | Credentials verified and session persistence completed. Invalid credentials/suspension are expected rejections, excluded. Login only; refresh/logout need separate instrumentation before adding to scope. |
| Service recovery time | Duration from first failed external probe to third consecutive successful probe; **90% <=15 minutes** | Diagnostic objective, assuming automated rollback and staffed on-call. Mean and open outage age also shown. Recovery histograms contain completed incidents only; ongoing outages alert after 15 minutes. |

## Classification and coverage

`banking_sli_requests_total{outcome}` labels are `success`, `business_rejection`, `technical_failure`. HTTP 408, 429, 5xx and aborted responses consume request budget. Other 4xx are initially treated as valid client rejections at the HTTP boundary; audit this assumption because a broken auth deployment or malformed gateway request can produce 4xx. External probes and explicit domain metrics provide independent signals. Client disconnects count conservatively as technical failures because the server cannot prove who caused them.

Domain classification never infers rejection from HTTP status alone: `businessRejection(error)` marks deliberate decisions; unknown exceptions count as technical failures. Known insufficient-funds, frozen-account and limit codes, nonexistent accounts, ownership denial, same-account transfer and invalid login credentials are valid rejections. Dependency timeouts, connection errors, DB errors, failed session persistence and failures after a transfer debit are technical failures. Failed compensation always consumes budget. A valid rejection is not a successful money movement: it is excluded from the transaction/auth technical denominator and displayed separately as a business KPI. Rejection growth requires fraud/product investigation even if SLOs remain green.

The existing application is midway through a PostgreSQL/Mongoose migration. The transaction `AppModule` has a TODO instead of a mounted domain module; the auth domain still references Mongoose while its root module provisions TypeORM. This change does not claim to repair that migration. Domain instrumentation is installed in the existing service methods, but does not emit usable traffic until those modules are deployed correctly. Missing transaction/authentication series trigger telemetry alerts; the deployment gate fails closed. The new TypeORM instrumentation covers auth service query runners, not all other services. Extend it at service bootstrap to broaden scope.

Prometheus counters are operational estimates: a crash before a terminal event, an unbounded pending operation, or a scrape gap can undercount failures. Before treating the transaction SLO as a production settlement guarantee, reconcile durable transaction states by stable operation ID, count overdue pending operations at an agreed deadline and export deduplicated outcomes from a durable outbox. Never put transaction/customer IDs, SQL, credentials or URLs into metric labels. Do not claim a financial correctness guarantee from counters.

## Run

```sh
docker compose -f docker-compose.observability.yml up -d
```

Configure `infrastructure/observability/slo/probes.json` for deployed critical APIs and set `SLO_PROBE_TOKEN` to a restricted synthetic user's short-lived token. Provide automated rotation in production. The default sample probes call the gateway's account and transaction list APIs and check response markers. Missing/expired credentials fail probes; they do not turn 401 into success. Use isolated synthetic data. The observer is on the Docker network and persists counters/outage start timestamps in `slo_observer_data`. A production observer should run outside the banking failure domain through public ingress; one local observer does not prove multi-region availability. Never run multiple observers writing the same volume.

Observer telemetry outages are UNKNOWN, not healthy. `up` describes scrape reachability, never customer API availability. Alert on missing/stale probes and investigate gaps. Three successful probes are used only for recovery confirmation, not to hide individual failed availability samples. A cold observer during an already active outage cannot recover the original outage start; reconcile it with incident records.

## PromQL

All rules live in `prometheus/rules/banking-slo.yaml` (JSON is valid YAML), loaded by the existing wildcard. Rules calculate `increase` before aggregating replicas, handling counter resets. The 30-day ratios are event-weighted, never averages of five-minute ratios.

```promql
# Seven SLI views
1 - banking:slo_error_ratio:30d{slo="availability"}
1 - banking:slo_error_ratio:30d{slo="requests"}
histogram_quantile(0.50, sum by (service, le) (rate(banking_sli_api_duration_seconds_bucket{job="banking",service="api-gateway"}[5m])))
histogram_quantile(0.95, sum by (service, le) (rate(banking_sli_api_duration_seconds_bucket{job="banking",service="api-gateway"}[5m])))
histogram_quantile(0.99, sum by (service, le) (rate(banking_sli_api_duration_seconds_bucket{job="banking",service="api-gateway"}[5m])))
1 - banking:slo_error_ratio:30d{slo="transactions"}
histogram_quantile(0.95, sum by (service, le) (rate(banking_db_query_duration_seconds_bucket{job="banking"}[5m])))
1 - banking:slo_error_ratio:30d{slo="authentication"}
sum by (service) (increase(banking_sli_recovery_seconds_sum[30d])) / sum by (service) (increase(banking_sli_recovery_seconds_count[30d]))
banking_sli_outage_age_seconds

# User-facing success KPI including valid rejections as unsuccessful outcomes
sum by (service, kind) (rate(banking_sli_operations_total{outcome="success"}[5m]))
/ sum by (service, kind) (rate(banking_sli_operations_total[5m]))

# Budgets and data coverage
banking:slo_budget_allowed:30d
banking:slo_budget_remaining:30d
banking:slo_budget_remaining_ratio:30d
banking:slo_burn_rate:1h
banking:slo_monitoring_coverage:30d
```

Zero traffic and zero completed recovery events yield NaN/no data, not 100%. New services have a partial window until 30 days of data exist. Domain counters initialize all outcomes on the first operation; missing denominators never become zero-error compliance. The old operational alerts remain independent and are not the SLO policy.

## Error budget arithmetic

For eligible events N, technical failures or slow events B and target S:

- Allowed bad events = `(1-S) * N`.
- Remaining events = `(1-S) * N - B` (negative means overspent).
- Consumed fraction = `B / ((1-S) * N)`; remaining fraction = `1 - consumed`.
- Burn rate = short-window bad ratio / `(1-S)`; 1x uses a full budget in one window under steady traffic.

At 99.9%, 1,000,000 requests allow 1,000 failures; 1,200 failures means -200 events and -20% remaining. At 99.95%, 1,000,000 eligible transactions allow 500 technical failures; 350 failures leaves 150, or 30%. For 100,000 API requests, the 300 ms objective permits 5,000 slow requests and the 1 s objective permits 1,000; these are separate, overlapping budgets, never added together. At 99.9% time availability, 30 days allows 43.2 minutes nominal downtime (99.95% would allow 21.6 minutes, but transaction budgets are event-based, not downtime). Probes approximate the time budget and must report sampling/monitoring gaps.

Fast burn alerts require >14.4x in both 1h and 5m, roughly 2% of a 30-day budget in an hour at steady traffic. Slow burn requires >6x in both 6h and 30m, roughly 5% in six hours. Separate alerts cover low/exhausted budget and recovery age. For very low traffic, use event counts and incident judgement; never disable availability probes to make a ratio look better.

## Deployment policy

SRE and the service owner review budgets daily. Product owns target acceptance. Evaluate the worst applicable SLO for the service and its dependencies; surplus in another SLO cannot offset a breach.

| State | Rule | Action |
|---|---|---|
| Normal | >=25% remains and no sustained elevated burn | Standard reviewed releases with canary and rollback. |
| Slow | 0–25% remains, or sustained >6x burn | Hold risky changes (schema/data migrations, major dependency changes, capacity reductions); reduce routine rollout size to <=10%, observe >=30 minutes and require service owner + on-call review. Prioritize reliability. |
| Freeze | <=0% remains | Freeze feature and risky infrastructure releases. Only incident mitigation, rollback, critical security fixes or changes demonstrably reducing risk may proceed. |
| Unknown | Missing/stale metrics, no eligible traffic, incomplete observation window | Block risky automatic deployments pending documented SRE review; unknown is not green. |

Run `node infrastructure/observability/slo/budget-gate.mjs` in the production pipeline before rollout (`PROMETHEUS_URL` defaults to localhost:9090). Exit 0 allows standard review; exit 2 blocks risky deployment for slow/frozen/unknown states. It checks the explicit critical-service inventory, current scrapes/probes and >=99% scrape coverage of the full window. Recovery and database objectives are diagnostic and do not independently gate deployments in this illustrative policy. The gate is supplied but must be attached to the actual production rollout job with network access to Prometheus; local CI cannot infer production budgets.

Exceptions require incident commander + service owner approval, a linked incident, scope/risk, evidence, canary, rollback and expiry in the incident timeline. Review within one business day. No deletion of failure data or target changes to bypass a freeze. Resume risky releases only when every affected budget is positive, mitigations are verified, and 1h/6h burn is <=1x for 24h; remain in slow mode until >=25% remains. Preserve these review decisions in the incident module. Do a postmortem for SEV-1/SEV-2 incidents and for any single incident consuming >=20% of a monthly budget.

## Validation and references

```sh
pnpm --filter @banking/observability test
node --test infrastructure/observability/slo/*.test.mjs
promtool check rules infrastructure/observability/prometheus/rules/banking-slo.yaml
```

Histogram ratios and quantiles follow [Prometheus histogram guidance](https://prometheus.io/docs/practices/histograms/). Burn-rate alerts and release controls adapt [Google SRE alerting guidance](https://sre.google/workbook/alerting-on-slos/) and [error budget policy](https://sre.google/workbook/error-budget-policy/).
