import { Counter, Histogram, Registry } from "prom-client";
import { getServiceMetrics } from "./metrics";

export type SloOutcome = "success" | "business_rejection" | "technical_failure";
export function httpOutcome(status: number, aborted = false): SloOutcome {
  if (aborted || status >= 500 || status === 408 || status === 429)
    return "technical_failure";
  if (status >= 400) return "business_rejection";
  return "success";
}

export function createSloMetrics(registry: Registry) {
  const requests = new Counter({
    name: "banking_sli_requests_total",
    help: "HTTP outcomes; 408, 429, 5xx and aborted responses are technical failures",
    labelNames: ["outcome"],
    registers: [registry],
  });
  const operations = new Counter({
    name: "banking_sli_operations_total",
    help: "Completed domain attempts, excluding idempotent replays",
    labelNames: ["kind", "operation", "outcome"],
    registers: [registry],
  });
  const latency = new Histogram({
    name: "banking_sli_api_duration_seconds",
    help: "HTTP duration including aborted responses",
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });
  for (const outcome of ["success", "business_rejection", "technical_failure"])
    requests.inc({ outcome }, 0);
  return { requests, operations, latency };
}

// Business classifications are explicit; unknown errors always consume budget.
export function domainOutcome(error: any): SloOutcome {
  return error?.sloBusinessRejection === true
    ? "business_rejection"
    : "technical_failure";
}
export function businessRejection<T extends Error>(error: T): T {
  Object.defineProperty(error, "sloBusinessRejection", { value: true });
  return error;
}

export async function observeOperation<T>(
  service: string,
  kind: "transaction" | "authentication",
  operation: string,
  handler: () => Promise<T>,
): Promise<T> {
  const counter = getServiceMetrics(service).slo.operations;
  for (const outcome of ["success", "business_rejection", "technical_failure"])
    counter.inc({ kind, operation, outcome }, 0);
  try {
    const result = await handler();
    counter.inc({ kind, operation, outcome: "success" });
    return result;
  } catch (error) {
    counter.inc({ kind, operation, outcome: domainOutcome(error) });
    throw error;
  }
}

/** SQL text, query parameters and customer identifiers are never metric labels. */
export function instrumentDataSource(
  dataSource: any,
  metrics: {
    dbQueryDuration: Histogram;
    dbErrors: Counter;
  },
): void {
  if (dataSource.__bankingSloInstrumented) return;
  dataSource.__bankingSloInstrumented = true;
  const create = dataSource.createQueryRunner;
  dataSource.createQueryRunner = function (...args: any[]) {
    const runner = create.apply(this, args);
    const query = runner.query;
    runner.query = async function (...queryArgs: any[]) {
      const verb = String(queryArgs[0]).trim().split(/\s/, 1)[0].toUpperCase();
      const operation = [
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "COMMIT",
        "ROLLBACK",
        "START",
      ].includes(verb)
        ? verb
        : "OTHER";
      const labels = { operation, collection: "postgresql" };
      const stop = metrics.dbQueryDuration.startTimer(labels);
      try {
        return await query.apply(this, queryArgs);
      } catch (error) {
        metrics.dbErrors.inc(labels);
        throw error;
      } finally {
        stop();
      }
    };
    return runner;
  };
}
