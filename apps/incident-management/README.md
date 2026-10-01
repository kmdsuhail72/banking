# Banking Incident Management

A standalone Node/Express + MongoDB incident service with a React interface and authenticated WebSocket updates. It shares Prometheus/Grafana with the banking platform but has independent storage and operator credentials so customer authentication failures do not block incident response. It uses its own npm lockfile and is excluded from the pnpm workspace.

## Features and behavior

- Create incidents, assign an accountable owner and a responding operator, and classify SEV-1 through SEV-4.
- Strict forward lifecycle: **OPEN ? INVESTIGATING ? MITIGATING ? RESOLVED ? CLOSED**. An owner is required to advance, impact assessment to resolve, and root cause, postmortem and completed remediation tasks to close. Closed documents cannot be edited by operators; subsequent alert recovery signals may still append to their audit timeline.
- Timestamped, attributed timeline notes plus automatic creation, assignment, severity, lifecycle and task events. Documentation edits record the changed field names; this is an audit timeline, not full document revision storage.
- Impact, root cause and postmortem fields (plain text, up to 20,000 characters each); remediation tasks with owner, due date and status.
- Searchable, paginated history and 1–366 day analytics: severity, status, affected service, daily counts, and mean time from incident start to operator-confirmed resolution. Analytics use incidents opened within the requested window; unresolved incidents are excluded from the mean and displayed as active separately.
- Live authenticated WebSocket notifications; the UI refetches authoritative data after reconnect and polls every 30 seconds to cover missed messages. Unsaved drafts are preserved. Version-based optimistic concurrency returns HTTP 409 rather than silently losing another responder's changes.
- Critical Alertmanager events automatically open SEV-1 incidents with the alert name, affected service, original `startsAt`, description and Grafana SLO link. Stable identity hashes all sorted labels and the start time. Repeated/concurrent deliveries produce one incident per alert occurrence; a later occurrence produces a new incident.
- Resolved alerts append an alert-recovery event, **not** an automatic incident resolution. Late firing retries cannot reverse recovery. A resolved-first delivery still creates a historical OPEN incident needing operator confirmation. Noncritical alerts are ignored by this receiver.

Severity guidance: SEV-1 = widespread critical banking outage or integrity risk, immediate incident command; SEV-2 = major degradation/limited critical outage, urgent response; SEV-3 = limited impact with workaround, business-hours response; SEV-4 = low-impact issue or follow-up. On-call staff can reclassify automatic incidents as evidence arrives. Any integrity concern requires reconciliation independently of service availability.

## Local deployment

Prerequisites: Docker Engine/Compose, Node 22 for credential generation. Run from the repository root:

```sh
node apps/incident-management/scripts/init-secrets.mjs
docker compose -f docker-compose.observability.yml -f docker-compose.incidents.yml config --quiet
docker compose -f docker-compose.observability.yml -f docker-compose.incidents.yml up -d --build
```

Open **http://localhost:4020**. Sign in as `sre-admin` using the generated token in `.local/incidents/operators.json` (read it locally; do not paste it into tickets or commit it). Credentials are never bundled into the React application. Add named operators/viewers to that JSON and restart the service. Every token must be at least 32 characters. `init-secrets.mjs` refuses to overwrite existing credentials. `.local/` is git-ignored.

Grafana: http://localhost:3001, dashboards **Banking Incident Management** and **Banking SLOs and error budgets**. The existing local Grafana default is admin/admin; change it before exposing the stack. Prometheus: http://localhost:9090. Alertmanager: http://localhost:9093. Incident MongoDB is internal only, with persistent `incident_mongodb_data` volume.

The Compose overlay uses a dedicated Alertmanager configuration routing critical alerts to incidents; it does not send Slack/email. For an existing production Alertmanager, merge the `incidents` receiver and critical child route from `infrastructure/observability/slo/incident-alertmanager.yaml` into the existing routing tree, set `continue: true` to retain subsequent receivers, and mount the webhook token at `/run/secrets/webhook-token`. Preserve existing notification/inhibition policy as appropriate. Alertmanager retries failed deliveries; the endpoint only acknowledges after MongoDB writes complete. The integration accepts the Prometheus Alertmanager v4 webhook format. Grafana-managed alerts can be sent through this Alertmanager; the direct Grafana contact-point payload has a different contract and is not accepted as an interchangeable format.

The overlay mounts `slo/incident-prometheus.yaml`, which includes the base banking scrape targets plus authenticated incident metrics. Keep these configurations aligned when changing target inventory. Dashboard JSON files are provisioned automatically. The Grafana incident dashboard has a local Incident Command link; replace it with your public URL for deployment. Incident links use `GRAFANA_PUBLIC_URL`; untrusted alert-provided URLs are not used.

The SLO observer requires a working banking gateway and synthetic credentials as documented in [SLO.md](../../infrastructure/observability/SLO.md). This incident service works independently of the existing banking application's incomplete database migration; missing banking metrics/probes correctly remain unhealthy/unknown.

## Production configuration

| Variable | Default / purpose |
|---|---|
| `PORT` | `4020` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/banking_incidents`; use a dedicated authenticated TLS MongoDB replica set in production |
| `PUBLIC_ORIGIN` | `http://localhost:4020`; exact browser origin, HTTPS in production |
| `GRAFANA_PUBLIC_URL` | `http://localhost:3001`; used for incident dashboard links |
| `OPERATORS_FILE` | `/run/secrets/operators.json`; array of `{name, role: "operator" or "viewer", token}` |
| `WEBHOOK_TOKEN_FILE` | `/run/secrets/webhook-token`; shared only with Alertmanager |
| `METRICS_TOKEN_FILE` | `/run/secrets/metrics-token`; shared only with Prometheus |

Terminate HTTPS/WSS at your ingress and forward `/`, `/api/*` and `/ws` to port 4020. Preserve the browser Origin and WebSocket Upgrade headers; set an idle timeout longer than 60 seconds. The service does not trust arbitrary forwarded identity headers. Cookies are HttpOnly, SameSite=Strict, and Secure when the public origin is HTTPS. Session lifetime is eight hours. Operator tokens are held in server-side secret files; replace this bootstrap identity adapter with your organization’s SSO for centralized MFA/provisioning. Viewer access is read-only. Login is rate-limited per socket peer, so a shared reverse-proxy peer also shares the limit.

Deploy **one API replica** with this implementation: sessions and WebSocket fanout are process-local. A restart signs users out; MongoDB incidents remain durable. Before horizontal scaling, externalize sessions and broadcast notifications using an authenticated shared service/change stream; configure sticky routing only as an interim measure. MongoDB indexes must finish building before traffic is accepted. The unique occurrence index and version compare-and-swap protect concurrent writes within MongoDB single-document atomicity; no replica-set transaction requirement for local operation.

The local MongoDB is unauthenticated and only reachable inside the Compose network. Production must use dedicated credentials, network isolation, encryption, backups/PITR and a tested restore procedure. Run the service as the supplied unprivileged container user and ensure secrets are readable by UID 1000 (use your secrets manager's ownership settings; local Compose secret-file ownership varies by host). Never expose the MongoDB port. Restrict the Alertmanager receiver to your internal network in addition to its bearer token. The metrics endpoint also requires its own bearer token.

Timeline and task arrays are bounded (5,000 events, 100 tasks per incident). Archive/export long-lived incidents before reaching those limits; no destructive deletion API is provided. Postmortems are plain text to prevent stored HTML/script execution. Do not put customer/account data or secrets in incident descriptions. Plan retention with your banking records policy rather than adding automatic TTL deletion. Snapshot MongoDB before schema changes; restore into a separate DB to validate recovery before switching traffic. Rolling back the service image preserves stored documents.

## API

All `/api` routes except login and Alertmanager require the session cookie. Browser mutations require the exact `Origin: PUBLIC_ORIGIN`; viewers cannot mutate. Login: `POST /api/session` with `{name,token}`; current identity: `GET /api/session`; logout: `DELETE /api/session`.

| Method/path | Body or filters |
|---|---|
| `GET /api/operators` | Assignable operator names |
| `POST /api/incidents` | `title`, `service`, `severity`, optional `description` |
| `GET /api/incidents` | `status`, `severity`, `service`, escaped literal `search`, `page` (25/page) |
| `GET /api/incidents/:id` | Complete documentation, tasks, timeline and version |
| `PATCH /api/incidents/:id` | `version` plus owner/assignee/severity/status/title/description/impact/rootCause/postmortem |
| `POST /api/incidents/:id/events` | `version`, `message` |
| `POST /api/incidents/:id/tasks` | `version`, `title`, `assignee`, ISO `dueAt` |
| `PATCH /api/incidents/:id/tasks/:taskId` | `version`, `status` and/or `assignee` |
| `GET /api/analytics?days=30` | History aggregations, maximum 366 days |
| `POST /api/alertmanager` | Alertmanager v4 body, `Authorization: Bearer <webhook token>` |
| `GET /metrics` | `Authorization: Bearer <metrics token>` |
| `GET /health/live`, `GET /health/ready` | Process liveness / MongoDB readiness |
| `WS /ws` | Same-origin session cookie; messages `{type:"incident.changed",id,version}` |

API validation errors return 400, missing credentials 401, denied permissions/origin 403, absent resources 404, stale versions/invalid transitions 409 and unavailable dependencies 503. Re-read an incident before retrying a 409.

Example webhook body (send it with the webhook bearer token; change the start time to create another occurrence):

```json
{
  "version": "4",
  "status": "firing",
  "alerts": [{
    "status": "firing",
    "startsAt": "2026-01-01T12:00:00Z",
    "labels": {"alertname": "BankingSloBudgetExhausted", "severity": "critical", "service": "transaction-service"},
    "annotations": {"summary": "Transaction error budget exhausted", "description": "Freeze risky deployments and investigate dependency errors."}
  }]
}
```

To verify the full Prometheus ? Alertmanager ? incident path, temporarily load an alert rule with `expr: vector(1)`, `labels: {severity: critical, service: sre-smoke-test}` and a unique alertname. Reload Prometheus, confirm one incident appears despite repeat deliveries, then remove the test rule. Do not use a real outage to test notifications. To test only receiver persistence, POST the example body twice and confirm the same incident ID; then send `status: resolved` with `endsAt` on the same alert and confirm a recovery timeline event without automatic lifecycle closure.

## Development and validation

```sh
cd apps/incident-management
npm ci --ignore-scripts
npm run build
npm test
```

Integration tests start an isolated temporary MongoDB via `mongodb-memory-server` and exercise HTTP authentication/CSRF, viewer permissions, WebSocket updates, ownership/lifecycle validation, optimistic concurrency, remediation, analytics, metrics and concurrent webhook deduplication. On first run MongoDB is downloaded; to use an existing binary set `MONGOMS_SYSTEM_BINARY` and, only when deliberately testing a different installed version, `MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false`. Production uses the Compose MongoDB image, not the test server.

For local non-Docker development, set the three credential file variables and `MONGODB_URI`, then run `npm start`. It serves the built React app on port 4020. For UI hot reload use `npm run dev` on port 4021 and set the API process `PUBLIC_ORIGIN=http://localhost:4021`; Vite proxies API/WebSocket traffic. Run one API instance and rebuild the UI before production deployment.

CI is in `.github/workflows/incident-management.yml`. The banking SLO metrics, queries, budgets, release gate and known coverage limits are documented separately in [SLO.md](../../infrastructure/observability/SLO.md).

Design references: [MongoDB single-document atomicity](https://www.mongodb.com/docs/v8.0/core/write-operations-atomicity/), [Alertmanager webhook authorization](https://prometheus.io/docs/alerting/latest/configuration/), and [ws upgrade authentication](https://github.com/websockets/ws).
