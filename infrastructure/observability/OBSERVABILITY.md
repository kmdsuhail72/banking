# Observability Stack — Complete Guide

> **Banking Platform** · Prometheus · Grafana · Alertmanager · Loki · Promtail · Tempo · OTel Collector

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Banking Microservices (11 services · ports 4001–4011)                      │
│                                                                              │
│  @banking/observability SDK                                                  │
│    startTelemetry()  → OTLP HTTP (traces + metrics) → OTel Collector :4318  │
│    installMetrics()  → /metrics scrape endpoint (prom-client)                │
│    @banking/logger   → JSON logs with traceId/spanId → stdout                │
└───────────────────────────────┬────────────────────────────────────────────-┘
                                │ OTLP
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  OpenTelemetry Collector  :4317/:4318                                       │
│                                                                              │
│  Receivers:  otlp (gRPC + HTTP)                                              │
│  Processors: memory_limiter → filter/health → attributes/privacy → batch     │
│  Connectors: spanmetrics (RED metrics from traces)                           │
│              servicegraph (call graph metrics from traces)                   │
│  Exporters:  traces  → Tempo        :4317                                    │
│              metrics → Prometheus   :8889 (spanmetrics + OTLP metrics)       │
│              logs    → Loki         :3100                                    │
└──────────┬──────────────────────┬────────────────────────────────────────────┘
           │ OTLP/gRPC            │ HTTP push                   │ HTTP push
           ▼                      ▼                              ▼
      ┌─────────┐          ┌────────────┐               ┌─────────────┐
      │  Tempo  │          │ Prometheus │               │    Loki     │
      │  :3200  │          │   :9090    │               │   :3100     │
      │ (traces)│◄─────────│ (scrapes   │               │   (logs)    │
      │         │  remote  │  /metrics  │               │             │
      │         │  write   │  + rules)  │               │             │
      └────┬────┘          └─────┬──────┘               └──────┬──────┘
           │ TraceQL             │ PromQL                       │ LogQL
           └─────────────────────┼──────────────────────────────┘
                                 ▼
                         ┌───────────────┐
                         │    Grafana    │
                         │    :3001      │
                         │               │
                         │  Datasources: │
                         │  - Prometheus │
                         │  - Loki       │
                         │  - Tempo      │
                         │               │
                         │  Dashboards:  │
                         │  - Overview   │
                         │  - Service    │
                         │  - Traces     │
                         │  - Kubernetes │
                         └───────┬───────┘
                                 │ webhook
                         ┌───────▼───────┐
                         │ Alertmanager  │
                         │    :9093      │
                         └───────────────┘
```

---

## Quick Start

### Option 1 — Observability Stack Only (Docker Compose)

```powershell
# Start
docker compose -f docker-compose.observability.yml up -d

# Or use the script
.\scripts\start-observability.ps1

# Check health
.\scripts\check-health.ps1
```

### Option 2 — Full Stack (All 11 Services + Observability)

```powershell
# Build images first
docker compose -f docker-compose.full.yml build

# Start everything
.\scripts\start-observability.ps1 -Full

# Watch health continuously
.\scripts\check-health.ps1 -Watch
```

### Option 3 — Kubernetes

```powershell
# 1. Create observability namespace + apply all manifests
kubectl apply -f k8s/observability/namespace.yaml
kubectl apply -f k8s/observability/configmaps.yaml
kubectl apply -f k8s/observability/metrics-server.yaml
kubectl apply -f k8s/observability/deployments.yaml

# 2. Apply HPA and PDBs to banking namespace
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml

# 3. Forward Grafana port
kubectl port-forward -n observability svc/grafana 3001:3000
```

---

## Access URLs

| Service | URL | Credentials |
|---|---|---|
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | — |
| **Alertmanager** | http://localhost:9093 | — |
| **Loki** | http://localhost:3100 | — |
| **Tempo** | http://localhost:3200 | — |
| **OTel Collector** | http://localhost:13133 | (health check) |

---

## Grafana Dashboards

| Dashboard | UID | Description |
|---|---|---|
| **Banking — Overview** | `banking-overview` | Platform-wide RED metrics for all 11 services |
| **Banking — Service Dashboard** | `banking-service-dashboard` | Per-service drill-down (select service in dropdown) |
| **Banking — Traces** | `banking-traces` | Distributed trace explorer, service graph, error traces |
| **Banking — Kubernetes & HPA** | `banking-kubernetes` | Pod health, replica counts, HPA saturation |

Direct links (when running locally):
- Overview: http://localhost:3001/d/banking-overview
- Service: http://localhost:3001/d/banking-service-dashboard
- Traces: http://localhost:3001/d/banking-traces
- Kubernetes: http://localhost:3001/d/banking-kubernetes

---

## Service Instrumentation

Every service calls these **3 functions** from `@banking/observability`:

```typescript
// 1. Before any imports — patches HTTP, gRPC, Mongoose, IORedis, NestJS
startTelemetry('auth-service');

// In bootstrap():
// 2. Mounts /metrics endpoint + request middleware
installMetrics(app, 'auth-service');

// 3. Handles graceful OTEL flush on SIGTERM/SIGINT
installTelemetryShutdown(app);
```

### Environment Variables (per service)

| Variable | Value | Effect |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | OTLP endpoint |
| `OTEL_SERVICE_NAME` | `auth-service` | Service name in traces/metrics/logs |
| `OTEL_RESOURCE_ATTRIBUTES` | `service.version=1.0.0,...` | Extra resource tags |
| `OTEL_SDK_DISABLED` | `true` | Disable telemetry entirely |

---

## Metrics Reference

All metrics are prefixed with `banking_`:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `banking_http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `banking_http_request_duration_seconds` | Histogram | method, route, status_code | HTTP latency |
| `banking_http_active_requests` | Gauge | method | In-flight requests |
| `banking_grpc_request_duration_seconds` | Histogram | method, status_code | gRPC latency |
| `banking_db_query_duration_seconds` | Histogram | operation, collection | MongoDB query time |
| `banking_db_errors_total` | Counter | operation, collection | MongoDB errors |
| `banking_cache_operations_total` | Counter | operation, status | Redis ops |
| `banking_cache_hit_ratio` | Gauge | — | Cache hit rate |
| `banking_business_events_total` | Counter | event_type, status | Domain events |
| `traces_spanmetrics_calls_total` | Counter | service_name, ... | Span call rate (OTel) |
| `traces_service_graph_request_total` | Counter | client, server | Service-to-service calls |

---

## Alert Rules

Alert rules live in [`prometheus/rules/banking.yaml`](./prometheus/rules/banking.yaml).

| Alert | Severity | Trigger |
|---|---|---|
| `BankingServiceDown` | 🔴 critical | Service unreachable for 1m |
| `BankingServiceCrashLoop` | 🔴 critical | >2 restarts in 5m |
| `BankingPodNotReady` | 🔴 critical | Pod not ready for 5m |
| `BankingPodOOMKilled` | 🔴 critical | OOM kill detected |
| `BankingHighErrorRate` | 🔴 critical | 5xx rate >1% for 5m |
| `BankingHighP99Latency` | 🔴 critical | p99 >2s for 5m |
| `BankingElevatedErrorRate` | 🟡 warning | 5xx rate >0.1% for 5m |
| `BankingHighP95Latency` | 🟡 warning | p95 >1s for 5m |
| `BankingHighP50Latency` | 🟡 warning | p50 >500ms for 10m |
| `BankingHighMemoryUsage` | 🟡 warning | RSS >512MiB for 10m |
| `BankingCriticalMemoryUsage` | 🔴 critical | RSS >1GiB for 5m |
| `BankingHighCPUUsage` | 🟡 warning | CPU >80% for 10m |
| `BankingHighActiveRequests` | 🟡 warning | Active requests >200 |
| `BankingHighDBQueryLatency` | 🟡 warning | MongoDB p95 >500ms for 5m |
| `BankingServiceNoTraffic` | 🟡 warning | 0 requests for 15m (service up) |
| `BankingHighGrpcErrorRate` | 🟡 warning | gRPC non-OK >5% for 5m |
| `BankingHPAMaxReplicas` | 🟡 warning | HPA at max for 5m |
| `BankingHPAUnableToScale` | 🔴 critical | HPA scaling disabled for 10m |

---

## Log → Trace Correlation

Every log line from `@banking/logger` includes `traceId` and `spanId` fields:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "payment-service",
  "message": "Payment initiated",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "userId": "usr_123"
}
```

In Grafana:
1. Open any Loki log line that has a `traceId`
2. Click **"View Trace in Tempo"** link (auto-derived field)
3. Tempo opens the full distributed trace for that request

In Tempo:
1. Click any span in a trace
2. Click **"Related logs"** to jump to Loki logs filtered by that `traceId`

---

## HPA & Autoscaling

All 11 services have HPA manifests in [`k8s/hpa.yaml`](../../k8s/hpa.yaml).

**Scaling strategy:**
- **CPU target**: 70% (65% for transaction/payment, 60% for kyc-risk)
- **Memory target**: 80% (75% for high-load services)
- **Min replicas**: 2 (zero-downtime rolling updates)
- **Max replicas**: 8–15 depending on service
- **Scale-up**: fast (30–60s stabilization)
- **Scale-down**: slow (5–10m stabilization, avoids flapping)

**Verify HPA is working:**

```bash
kubectl get hpa -n banking
kubectl describe hpa transaction-service -n banking
kubectl top pods -n banking
```

---

## Adding a New Service

1. **Call the 3 functions** in `main.ts` (same pattern as auth-service)
2. **Add a scrape target** to `infrastructure/observability/prometheus.yaml`:
   ```yaml
   - targets: [host.docker.internal:4012]
     labels:
       service: new-service
       service_name: New Service
   ```
3. **Add environment variables** to `docker-compose.full.yml`:
   ```yaml
   OTEL_SERVICE_NAME: new-service
   ```
4. **Add HPA** entry to `k8s/hpa.yaml`
5. **Add PDB** entry to `k8s/pdb.yaml`
6. Restart: `docker compose -f docker-compose.observability.yml restart prometheus`

---

## Troubleshooting

### Grafana shows "No data"
- Check Prometheus targets: http://localhost:9090/targets — all should be UP
- Verify services expose `/metrics` — `curl http://localhost:4001/metrics | head`
- Check OTel Collector logs: `docker logs banking-otel-collector-1`

### Traces not appearing in Tempo
- Verify `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` is set
- Check collector logs: `docker logs banking-otel-collector-1`
- Verify Tempo is receiving: `curl http://localhost:3200/ready`

### Logs not appearing in Loki
- Check Promtail logs: `docker logs banking-promtail-1`
- Verify Docker socket is accessible: `docker ps` from within Promtail
- Check Loki: `curl http://localhost:3100/ready`

### Alerts not firing
- Check rules loaded: http://localhost:9090/rules
- Verify alertmanager connected: http://localhost:9090/alerts
- Check alertmanager config: http://localhost:9093/#/status

### HPA shows `<unknown>` for metrics
- Ensure `metrics-server` is running: `kubectl get pods -n kube-system | grep metrics`
- Check metrics API: `kubectl top nodes`
- Wait 2–3 minutes after deployment for metrics to populate
