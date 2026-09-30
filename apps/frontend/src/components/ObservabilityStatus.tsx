"use client";
import { useEffect, useState } from "react";
export function ObservabilityStatus() {
  const [status, setStatus] = useState<{
    collector: boolean;
    prometheus: boolean;
    jaeger: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/observability", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        setStatus(await response.json());
      } catch {
        if (!controller.signal.aborted) setStatus(null);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);
  return (
    <div className="mt-3 text-[10px] space-y-2" aria-live="polite">
      <p className={status?.collector ? "text-emerald-400" : "text-amber-300"}>
        {status === null
          ? "Telemetry status unavailable"
          : status.collector
            ? "✔ OTLP Collector Ready"
            : "○ OTLP Collector Offline"}
      </p>
      <div className="flex gap-3">
        <a
          href="http://localhost:9090"
          target="_blank"
          rel="noreferrer"
          className="text-slate-300 hover:text-white"
        >
          Prometheus {status?.prometheus ? "●" : "○"} ↗
        </a>
        <a
          href="http://localhost:16686"
          target="_blank"
          rel="noreferrer"
          className="text-slate-300 hover:text-white"
        >
          Jaeger {status?.jaeger ? "●" : "○"} ↗
        </a>
      </div>
    </div>
  );
}
