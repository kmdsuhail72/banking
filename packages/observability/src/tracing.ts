import { context, trace } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { GrpcInstrumentation } from "@opentelemetry/instrumentation-grpc";
import { MongooseInstrumentation } from "@opentelemetry/instrumentation-mongoose";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";

let sdk: NodeSDK | undefined;

/**
 * Call BEFORE importing Nest, HTTP clients, grpc-js, ioredis, or mongoose so
 * module hooks can patch them.  Exports:
 *  – Traces  → OTLP HTTP → otel-collector → Tempo
 *  – Metrics → OTLP HTTP → otel-collector → Prometheus (exemplar-linked)
 */
export function startTelemetry(serviceName: string): void {
  if (sdk || process.env.OTEL_SDK_DISABLED === "true") return;

  const resource = resourceFromAttributes({
    "service.name": process.env.OTEL_SERVICE_NAME || serviceName,
    "service.version": process.env.npm_package_version || "1.0.0",
    "deployment.environment": process.env.NODE_ENV || "development",
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      // Honour OTEL_EXPORTER_OTLP_ENDPOINT env var; fall back to localhost
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
        `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url:
          process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
          `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"}/v1/metrics`,
      }),
      // Export every 15 s — fast enough for dashboards, cheap enough at scale.
      exportIntervalMillis: 15_000,
    }),
    instrumentations: [
      // ─── HTTP ──────────────────────────────────────────────────────────────
      new HttpInstrumentation({
        // Skip health / metrics probes — they're high volume and noise.
        ignoreIncomingRequestHook: (req) =>
          /^\/(health|metrics)(\/?|$|\?)/.test(req.url || ""),
        requestHook(span, req) {
          // Scrub query strings — they can contain tokens or PII.
          const path = "path" in req ? req.path : req.url;
          if (path) {
            const clean = path.split("?")[0];
            span.setAttribute("http.target", clean);
            span.setAttribute("http.url", clean);
          }
        },
        responseHook(span) {
          span.setAttribute("url.query", "[redacted]");
        },
      }),

      // ─── gRPC ──────────────────────────────────────────────────────────────
      // grpc-js client/server interceptors propagate W3C context through metadata.
      new GrpcInstrumentation(),

      // ─── Mongoose ──────────────────────────────────────────────────────────
      new MongooseInstrumentation({
        // Don't capture raw BSON — can contain customer data.
        dbStatementSerializer: (_op, _payload) => "[redacted]",
      }),

      // ─── IORedis ───────────────────────────────────────────────────────────
      new IORedisInstrumentation({
        // Skip SET/GET of JWT tokens to avoid leaking them into spans.
        dbStatementSerializer: (cmdName, _cmdArgs) => cmdName,
      }),

      // ─── NestJS Core ───────────────────────────────────────────────────────
      // Adds controller/handler names to span names for better grouping.
      new NestInstrumentation(),
    ],
  });

  sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  const current = sdk;
  sdk = undefined;
  await current?.shutdown();
}

export function getTraceContext(): { traceId?: string; spanId?: string } {
  const current = trace.getSpan(context.active())?.spanContext();
  return current ? { traceId: current.traceId, spanId: current.spanId } : {};
}

export function installTelemetryShutdown(app: {
  close: () => Promise<void>;
}): void {
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    try {
      await app.close();
      await shutdownTelemetry();
      process.exitCode = 0;
    } catch (error) {
      console.error("Telemetry shutdown failed", error);
      process.exitCode = 1;
    } finally {
      clearTimeout(timeout);
      process.exit();
    }
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
