# Banking observability

`@banking/observability` now provides Prometheus metrics, OpenTelemetry HTTP and grpc-js instrumentation, a unary gRPC metrics interceptor, trace context access, and graceful exporter shutdown. The gateway and all eleven services initialize telemetry before Nest and mount `/metrics` before application routes.

## Run locally

```powershell
pnpm --filter @banking/observability build
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
pnpm dev
```

- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686
- Collector readiness: http://localhost:13133/
- OTLP HTTP traces: http://localhost:4318/v1/traces
- OTLP gRPC receiver: localhost:4317
- Gateway metrics: http://localhost:3000/metrics
- Service metrics: http://localhost:4001/metrics through http://localhost:4011/metrics

The landing page polls `/api/observability` every 30 seconds. The Collector Ready badge reflects an actual readiness response, with separate Prometheus and Jaeger indicators. Collector readiness alone does not guarantee trace delivery; use the verification below.

The compose overlay is for local development: UIs and OTLP ports are bound to loopback, Prometheus stores seven days of data in its own volume, and Jaeger uses transient memory storage. Restarting Jaeger loses traces. Linux-hosted services must accept traffic from the Docker bridge (`host-gateway` is configured). Containerized services need service DNS names in the scrape config instead of `host.docker.internal`. Deployments must keep service `/metrics` endpoints on a private network; this implementation does not add authentication to scrapes.

## Configuration

The SDK honors standard environment variables. Set them in the service process environment **before startup**, because telemetry initializes before application configuration loads:

| Variable                                          | Purpose                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `OTEL_SDK_DISABLED=true`                          | Disable trace SDK initialization; Prometheus metrics remain available.                      |
| `OTEL_SERVICE_NAME`                               | Override the per-service default name. Avoid a single shared override across every service. |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                     | Collector base URL, default `http://localhost:4318`.                                        |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`              | Explicit trace URL including `/v1/traces`.                                                  |
| `OTEL_EXPORTER_OTLP_HEADERS`                      | Export authentication headers for a remote collector.                                       |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` | E.g. `parentbased_traceidratio` / `0.1` for 10% root sampling.                              |

The SDK batches trace exports. The Collector applies memory limiting, privacy filtering, and batching before exporting traces over OTLP to Jaeger. Prometheus directly scrapes service registries plus the Collector's OTLP-metrics exporter. No duplicate OTel metrics SDK is configured; custom OTLP metric producers can use the Collector's metrics pipeline.

## Metrics and tracing

- `banking_http_requests_total{service,method,route,status_code}`
- `banking_http_request_duration_seconds` histogram with the same labels
- `banking_grpc_request_duration_seconds{service,method,status_code}` histogram
- `banking_process_*` and `banking_nodejs_*` CPU, memory, event loop, GC and process metrics

HTTP labels use Express route templates; unmatched paths use a fixed `unmatched` label. Health and metrics probes are excluded from request counters and traces. Bodies, passwords, cookies, and authorization headers are not deliberately captured. The Collector removes URL/query attributes to avoid reset-token leakage. Do not add arbitrary user-supplied metadata to span attributes.

HTTP instrumentation preserves W3C trace context from gateway to downstream services, including Axios outbound requests. grpc-js instrumentation adds client/server spans and metadata propagation for unary and streaming RPCs. Existing banking services currently expose HTTP endpoints; adding instrumentation does not turn the placeholder gRPC definitions into running RPC servers.

For unary handler metrics, use the wrapper with a fixed method label:

```ts
const metrics = installMetrics(app, "account-service");
const account = await interceptGrpc(metrics, "/banking.Account/Get", () =>
  service.getAccount(id),
);
```

The wrapper preserves results/errors and records canonical gRPC status codes, including synchronous exceptions. Streaming tracing is automatic, but the unary timing wrapper should not be used to measure streaming completion. `getTraceContext()` returns `{ traceId, spanId }` for correlation with application logs. Shutdown hooks close Nest, flush telemetry, and enforce a ten-second deadline.

## Verify

```powershell
pnpm --filter @banking/observability test
```

Tests cover registry isolation, route cardinality/privacy, probe exclusion, unary success/error handling, actual grpc-js propagation and OTLP export to a local test collector. The tests do not require Docker or external servers.

To generate a harmless cross-service trace, send **GET** `http://localhost:3000/api/v1/auth/login`. It intentionally returns 404 because login accepts POST; it creates no account and changes no credentials. In Jaeger, select `api-gateway`: the same trace should contain gateway and auth-service spans. In Prometheus, inspect `up{job="banking"}` (12 targets), `sum by(service)(rate(banking_http_requests_total[5m]))`, and `histogram_quantile(0.95, sum by(le,service)(rate(banking_http_request_duration_seconds_bucket[5m])))`.

Implementation references: [OpenTelemetry JS instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/), [instrumentation libraries](https://opentelemetry.io/docs/languages/js/libraries/), [OTLP configuration](https://opentelemetry.io/docs/specs/otel/protocol/exporter/), and [Collector configuration](https://opentelemetry.io/docs/collector/configuration/).
