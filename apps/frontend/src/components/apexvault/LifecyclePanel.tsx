"use client";

import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";

function Toggle({ initial = true }: { initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative h-5 w-9 rounded-full transition ${on ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.35)]" : "bg-slate-700"}`}
      aria-label="Toggle event listener"
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function LifecyclePanel() {
  const [sweeps, setSweeps] = useState(72);
  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[.15em] text-violet-400">
          Authorization control
        </p>
        <h2 className="mt-1 text-sm font-semibold text-white">
          Multi-sig corporate movement
        </h2>
        <div className="mt-5 flex items-center gap-3">
          <div className="relative grid h-14 w-14 place-items-center rounded-full border-4 border-violet-500/40 border-t-violet-400">
            <span className="font-mono text-sm font-bold text-white">2/3</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">
              Two keys verified
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Treasury approval required before the transfer window closes.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            "A. Mehta · Finance owner",
            "S. Patel · Treasury signer",
            "L. Chen · Compliance key",
          ].map((label, index) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-black/20 px-2.5 py-2"
            >
              <span className="font-mono text-[10px] text-slate-400">
                {label}
              </span>
              {index < 2 ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <span className="text-[9px] text-amber-300">PENDING</span>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[.15em] text-blue-400">
          Kafka event listeners
        </p>
        <div className="mt-4 space-y-3">
          {["account.created", "account.frozen", "ledger.reconciled"].map(
            (event, index) => (
              <div key={event} className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-300">
                  {event}
                </span>
                <Toggle initial={index !== 1} />
              </div>
            ),
          )}
        </div>
        <button className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700 py-2 text-xs font-medium text-slate-300 hover:border-blue-500 hover:text-blue-300">
          Configure webhook <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.15em] text-emerald-400">
              Automated sweeps
            </p>
            <h2 className="mt-1 text-sm font-semibold text-white">
              Surplus liquidity routing
            </h2>
          </div>
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-3 text-[11px] leading-4 text-slate-500">
          Sweep fiat surplus to high-yield staking after the reserve floor is
          met.
        </p>
        <div className="mt-4">
          <div className="mb-2 flex justify-between font-mono text-[10px]">
            <span className="text-slate-500">Reserve threshold</span>
            <span className="text-emerald-300">
              ${(sweeps * 25000).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="40"
            max="100"
            value={sweeps}
            onChange={(event) => setSweeps(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-emerald-500"
          />
          <div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600">
            <span>$1M</span>
            <span>$2.5M</span>
          </div>
        </div>
        <button className="mt-4 w-full rounded-lg bg-emerald-500 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 active:scale-[.98]">
          Save sweep rule
        </button>
      </section>
    </aside>
  );
}
