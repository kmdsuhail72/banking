import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import { trace, context } from "@opentelemetry/api";

export function createMetrics(service: string) {
  const registry = new Registry();
  registry.setDefaultLabels({ service });

  // ── Default Node.js metrics (process_cpu_*, process_resident_memory_*, etc.) ─
  collectDefaultMetrics({ register: registry, prefix: "banking_" });

  // ── HTTP ─────────────────────────────────────────────────────────────────────
  const requests = new Counter({
    name: "banking_http_requests_total",
    help: "Total completed HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [registry],
  });

  const duration = new Histogram({
    name: "banking_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  const activeRequests = new Gauge({
    name: "banking_http_active_requests",
    help: "Number of HTTP requests currently being processed",
    labelNames: ["method"],
    registers: [registry],
  });

  // ── gRPC ─────────────────────────────────────────────────────────────────────
  const grpc = new Histogram({
    name: "banking_grpc_request_duration_seconds",
    help: "gRPC handler duration in seconds",
    labelNames: ["method", "status_code"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry],
  });

  // ── Database ─────────────────────────────────────────────────────────────────
  const dbQueryDuration = new Histogram({
    name: "banking_db_query_duration_seconds",
    help: "MongoDB query duration in seconds",
    labelNames: ["operation", "collection"],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });

  const dbErrors = new Counter({
    name: "banking_db_errors_total",
    help: "Total MongoDB operation errors",
    labelNames: ["operation", "collection"],
    registers: [registry],
  });

  // ── Cache (Redis) ─────────────────────────────────────────────────────────────
  const cacheOperations = new Counter({
    name: "banking_cache_operations_total",
    help: "Total Redis cache operations",
    labelNames: ["operation", "status"],
    registers: [registry],
  });

  const cacheHitRatio = new Gauge({
    name: "banking_cache_hit_ratio",
    help: "Rolling cache hit ratio (hits / (hits + misses))",
    registers: [registry],
  });

  // ── Business ──────────────────────────────────────────────────────────────────
  const businessEvents = new Counter({
    name: "banking_business_events_total",
    help: "Domain-level events (transactions, payments, KYC checks, etc.)",
    labelNames: ["event_type", "status"],
    registers: [registry],
  });

  return {
    registry,
    requests,
    duration,
    activeRequests,
    grpc,
    dbQueryDuration,
    dbErrors,
    cacheOperations,
    cacheHitRatio,
    businessEvents,
  };
}

export type ServiceMetrics = ReturnType<typeof createMetrics>;

/**
 * Mount the /metrics endpoint and request-level middleware.
 * Call this BEFORE registering application routes.
 * Labels use route templates (never raw URLs) to avoid high cardinality.
 */
export function installMetrics(
  app: { use: (...args: any[]) => any; getHttpAdapter: () => any },
  service: string,
): ServiceMetrics {
  const metrics = createMetrics(service);
  const { registry, requests, duration, activeRequests } = metrics;

  // ── Prometheus scrape endpoint ────────────────────────────────────────────
  app
    .getHttpAdapter()
    .getInstance()
    .get("/metrics", async (_req: any, res: any) => {
      try {
        res.setHeader("Content-Type", registry.contentType);
        res.end(await registry.metrics());
      } catch {
        res.status(500).end("Metrics collection failed");
      }
    });

  // ── Per-request middleware ────────────────────────────────────────────────
  app.use((req: any, res: any, next: () => void) => {
    if (/^\/(health|metrics)(\/|\?|$)/.test(req.url || "")) return next();

    const started = process.hrtime.bigint();
    const span = trace.getSpan(context.active());
    activeRequests.inc({ method: req.method });

    res.once("finish", () => {
      activeRequests.dec({ method: req.method });
      const route = req.route?.path || "unmatched";
      const method = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].includes(
        req.method,
      )
        ? req.method
        : "OTHER";
      const labels = {
        method,
        route: String(route),
        status_code: String(res.statusCode),
      };
      requests.inc(labels);
      duration.observe(labels, Number(process.hrtime.bigint() - started) / 1e9);

      // Enrich the active OTel span with route template (not the raw URL).
      span?.updateName(`${method} ${route}`);
      span?.setAttribute("http.route", String(route));
    });
    next();
  });

  return metrics;
}

/**
 * Wrap a unary gRPC handler.
 * grpc-js instrumentation supplies the active distributed span automatically.
 */
export function interceptGrpc<T>(
  metrics: ServiceMetrics,
  method: string,
  handler: () => Promise<T>,
): Promise<T> {
  const stop = metrics.grpc.startTimer({ method });
  return Promise.resolve()
    .then(handler)
    .then(
      (result) => {
        stop({ status_code: "0" });
        return result;
      },
      (error) => {
        const code =
          Number.isInteger(error?.code) && error.code >= 0 && error.code <= 16
            ? error.code
            : 2;
        stop({ status_code: String(code) });
        throw error;
      },
    );
}

/**
 * Record a domain-level business event (e.g. "payment_initiated", "kyc_approved").
 * Use this in service controllers to track business KPIs in Grafana.
 *
 * @example
 *   recordBusinessEvent(metrics, 'payment_initiated', 'success');
 */
export function recordBusinessEvent(
  metrics: ServiceMetrics,
  eventType: string,
  status: "success" | "failure" | "pending",
): void {
  metrics.businessEvents.inc({ event_type: eventType, status });
}
