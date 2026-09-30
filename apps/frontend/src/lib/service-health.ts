import { MICROSERVICES } from "./service-catalog";

export interface ServiceHealth {
  id: string;
  status: "healthy" | "degraded" | "offline";
  latencyMs: number | null;
  uptimeSeconds: number | null;
  detail: string;
}

export interface HealthSnapshot {
  checkedAt: string;
  services: ServiceHealth[];
}

// Targets come only from server configuration, never from request parameters.
export async function checkServices(): Promise<HealthSnapshot> {
  const services = await Promise.all(
    MICROSERVICES.map(async (service): Promise<ServiceHealth> => {
      const key = service.id.toUpperCase().replace(/-/g, "_");
      const url =
        process.env[`${key}_HEALTH_URL`] ||
        `http://127.0.0.1:${service.httpPort}/health`;
      const started = performance.now();
      try {
        const response = await fetch(url, {
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(2500),
        });
        const body = await response.json().catch(() => null);
        const healthy = response.ok && body?.status === "ok";
        return {
          id: service.id,
          status: healthy ? "healthy" : "degraded",
          latencyMs: Math.round((performance.now() - started) * 10) / 10,
          uptimeSeconds:
            typeof body?.uptimeSeconds === "number" &&
            Number.isFinite(body.uptimeSeconds) &&
            body.uptimeSeconds >= 0
              ? body.uptimeSeconds
              : null,
          detail: healthy
            ? "Health endpoint reports OK"
            : response.ok
              ? "Unexpected health response"
              : `Health endpoint returned HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          id: service.id,
          status: "offline",
          latencyMs: null,
          uptimeSeconds: null,
          detail:
            error instanceof Error && error.name === "TimeoutError"
              ? "Health check timed out after 2.5s"
              : "Health endpoint unreachable",
        };
      }
    }),
  );
  return { checkedAt: new Date().toISOString(), services };
}
