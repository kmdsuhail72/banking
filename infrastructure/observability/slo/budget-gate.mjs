import { pathToFileURL } from "node:url";
export const expected = [
  ["critical-accounts", "availability"],
  ["critical-transactions", "availability"],
  ["api-gateway", "requests"],
  ["api-gateway", "api_p95"],
  ["api-gateway", "api_p99"],
  ["transaction-service", "transactions"],
  ["auth-service", "authentication"],
];
export function decision(rows, now = Date.now() / 1000) {
  for (const [service, slo] of expected) {
    const row = rows.find(
      (r) => r.metric.service === service && r.metric.slo === slo,
    );
    if (
      !row ||
      now - Number(row.value[0]) > 90 ||
      !Number.isFinite(Number(row.value[1]))
    )
      return {
        state: "UNKNOWN",
        exit: 2,
        reason: `Missing, stale or non-finite budget: ${service}/${slo}`,
      };
    if (Number(row.value[1]) <= 0)
      return {
        state: "FREEZE",
        exit: 2,
        reason: `Exhausted budget: ${service}/${slo}`,
      };
  }
  if (rows.some((r) => Number(r.value[1]) < 0.25))
    return {
      state: "SLOW",
      exit: 2,
      reason: "Less than 25% budget remains; risky releases blocked",
    };
  return {
    state: "NORMAL",
    exit: 0,
    reason: "All required budgets above reserve",
  };
}
async function main() {
  const base = process.env.PROMETHEUS_URL || "http://localhost:9090";
  async function query(expr) {
    const url = new URL("/api/v1/query", base);
    url.searchParams.set("query", expr);
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw Error("Prometheus unavailable");
    const body = await r.json();
    if (body.status !== "success") throw Error("Prometheus query failed");
    return body.data.result;
  }
  const coverage = await query(
    'banking:slo_monitoring_coverage:30d{job=~"banking|banking-slo-probes"}',
  );
  for (const service of ["api-gateway", "auth-service", "transaction-service"])
    if (
      !coverage.some(
        (r) => r.metric.service === service && Number(r.value[1]) >= 0.99,
      )
    )
      throw Error(`Incomplete 30-day monitoring window: ${service}`);
  if (
    !coverage.some(
      (r) =>
        r.metric.job === "banking-slo-probes" && Number(r.value[1]) >= 0.99,
    )
  )
    throw Error("Incomplete observer history");
  const up = await query(
    'up{job="banking",service=~"api-gateway|auth-service|transaction-service"} or up{job="banking-slo-probes"}',
  );
  if (
    up.length < 4 ||
    up.some(
      (r) =>
        Number(r.value[1]) !== 1 || Date.now() / 1000 - Number(r.value[0]) > 45,
    )
  )
    throw Error("Required telemetry is unavailable");
  const probes = await query(
    "time() - banking_sli_probe_last_timestamp_seconds",
  );
  if (probes.length < 2 || probes.some((r) => Number(r.value[1]) > 45))
    throw Error("External probes are stale");
  const result = decision(
    await query(
      'banking:slo_budget_remaining_ratio:30d{slo!~"database|recovery"}',
    ),
  );
  const burn = await query(
    "banking:slo_burn_rate:1h > 6 and banking:slo_burn_rate:5m > 6",
  );
  if (burn.length && result.exit === 0) {
    result.state = "SLOW";
    result.exit = 2;
    result.reason = "Sustained elevated burn; risky releases blocked";
  }
  console.log(JSON.stringify(result));
  process.exitCode = result.exit;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(JSON.stringify({ state: "UNKNOWN", reason: e.message }));
    process.exitCode = 2;
  });
