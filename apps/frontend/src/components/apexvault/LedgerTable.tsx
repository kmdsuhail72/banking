"use client";

import { Copy, ExternalLink, Filter, Search } from "lucide-react";
import { useState } from "react";

const entries = [
  {
    time: "10:42:18.442",
    id: "txn_3f92a78b",
    hash: "0x7aa…c91e",
    source: "CORP-USD-001",
    target: "OPX-ETH-VAULT",
    type: "Staking",
    status: "PROCESSING",
    amount: "− $84,000.00",
  },
  {
    time: "10:41:02.115",
    id: "txn_7b10e4cc",
    hash: "0x1d9…52fa",
    source: "MKT-EUR-042",
    target: "CORP-USD-001",
    type: "Credit",
    status: "SUCCESS",
    amount: "+ $294,500.00",
  },
  {
    time: "10:38:51.071",
    id: "txn_ef0917cd",
    hash: "0xab4…1e23",
    source: "CORP-USD-001",
    target: "VENDOR-AP-719",
    type: "Debit",
    status: "SUCCESS",
    amount: "− $32,840.64",
  },
  {
    time: "10:36:29.938",
    id: "txn_c984bd23",
    hash: "0x88f…a129",
    source: "BTC-CUSTODY-09",
    target: "TRSY-BTC-100",
    type: "Staking",
    status: "FAILED",
    amount: "− ₿ 0.4200",
  },
  {
    time: "10:31:10.392",
    id: "txn_551cf0a9",
    hash: "0x09a…e882",
    source: "CASH-USD-011",
    target: "CORP-USD-001",
    type: "Credit",
    status: "SUCCESS",
    amount: "+ $14,900.00",
  },
];

const statusClass: Record<string, string> = {
  SUCCESS: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  PROCESSING: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  FAILED: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

export function LedgerTable() {
  const [active, setActive] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1200);
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
      <header className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-blue-400">
            Double-entry ledger
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">
            Revolving transaction journal
          </h2>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              className="w-28 bg-transparent font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600"
              placeholder="Find ledger line"
            />
          </label>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-300"
            aria-label="Filter ledger"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
          <thead className="border-b border-slate-800 bg-black/20 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-3 py-3 font-medium">Transaction ID / Hash</th>
              <th className="px-3 py-3 font-medium">Source account</th>
              <th className="px-3 py-3 font-medium">Destination account</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                onMouseEnter={() => setActive(entry.id)}
                onMouseLeave={() => setActive(null)}
                className={`group transition ${active === entry.id ? "bg-blue-500/[.07] shadow-[inset_3px_0_0_#3b82f6]" : "hover:bg-slate-800/50"}`}
              >
                <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-slate-500">
                  2026-09-11{" "}
                  <span className="text-slate-300">{entry.time}</span>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copy(entry.id)}
                      className="rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 font-mono text-[10px] text-blue-300 hover:border-blue-500"
                    >
                      {copied === entry.id ? "COPIED" : entry.id}
                    </button>
                    <button
                      onClick={() => copy(entry.hash)}
                      className="font-mono text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      {entry.hash}
                    </button>
                  </div>
                  {active === entry.id && (
                    <p className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-violet-300">
                      <ExternalLink className="h-2.5 w-2.5" />{" "}
                      kafka.ledger.entry.posted → reconciliation.v2
                    </p>
                  )}
                </td>
                <td className="px-3 py-4 font-mono text-[11px] text-slate-300">
                  {entry.source}
                </td>
                <td className="px-3 py-4 font-mono text-[11px] text-slate-300">
                  {entry.target}
                </td>
                <td className="px-3 py-4">
                  <span className="text-xs text-slate-300">{entry.type}</span>
                </td>
                <td className="px-3 py-4">
                  <span
                    className={`rounded-full border px-2 py-1 font-mono text-[9px] font-semibold ${statusClass[entry.status]}`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-4 text-right font-mono text-xs font-semibold tabular-nums ${entry.amount.startsWith("+") ? "text-emerald-300" : "text-slate-200"}`}
                >
                  {entry.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
        <span className="font-mono text-[10px] text-slate-500">
          Showing 5 of 24,908 immutable entries
        </span>
        <button className="flex items-center gap-1 text-xs font-semibold text-blue-400">
          Open full ledger <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </footer>
    </section>
  );
}
