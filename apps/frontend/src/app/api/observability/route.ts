import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const endpoints = {
    collector:
      process.env.OTEL_COLLECTOR_HEALTH_URL || "http://127.0.0.1:13133/",
    prometheus: process.env.PROMETHEUS_URL || "http://127.0.0.1:9090/-/ready",
    jaeger:
      process.env.JAEGER_HEALTH_URL || "http://127.0.0.1:16686/api/services",
  };
  const checks = await Promise.all(
    Object.entries(endpoints).map(async ([name, url]) => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(2500),
        });
        return [name, response.ok];
      } catch {
        return [name, false];
      }
    }),
  );
  return NextResponse.json(
    { ...Object.fromEntries(checks), checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
