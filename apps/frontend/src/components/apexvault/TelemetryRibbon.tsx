"use client";

import { Activity, Radio, ServerCog, Waves } from "lucide-react";

const metrics = [
  { label: "P99 latency", value: "4.2ms", tone: "text-blue-300" },
  { label: "Redis cache hit rate", value: "98.4%", tone: "text-emerald-300" },
  { label: "Kafka event lag", value: "0ms", tone: "text-emerald-300" },
];

export function TelemetryRibbon() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 shadow-[0_0_40px_rgba(59,130,246,.05)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <ServerCog className="h-4 w-4" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">
              account-service / nestjs
            </p>
            <p className="text-sm font-semibold text-slate-100">
              Core account metrics
            </p>
          </div>
          <span className="ml-2 hidden items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-emerald-300 sm:flex">
            <Radio className="h-3 w-3 animate-pulse" /> gRPC :50053 CONNECTED
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-[108px] px-3 py-1.5">
              <p className="text-[10px] text-slate-500">{metric.label}</p>
              <p
                className={`mt-0.5 font-mono text-xs font-semibold ${metric.tone}`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>
        <div className="hidden items-center gap-2 xl:flex">
          <Waves className="h-4 w-4 text-blue-400" />
          <div className="flex h-5 items-end gap-0.5">
            {[6, 13, 8, 18, 10, 15, 7, 12, 17, 9, 14, 6].map(
              (height, index) => (
                <i
                  key={index}
                  className="w-0.5 animate-pulse rounded-full bg-gradient-to-t from-blue-600 to-cyan-300"
                  style={{ height, animationDelay: `${index * 90}ms` }}
                />
              ),
            )}
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            steady throughput
          </span>
        </div>
      </div>
    </section>
  );
}
