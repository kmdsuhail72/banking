import { CustodyHub } from "@/components/apexvault/CustodyHub";
import { LedgerTable } from "@/components/apexvault/LedgerTable";
import { LifecyclePanel } from "@/components/apexvault/LifecyclePanel";
import { TelemetryRibbon } from "@/components/apexvault/TelemetryRibbon";
import { Bell, Command, Layers3, Plus } from "lucide-react";

export default function ApexVaultDashboard() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-slate-100">
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,.09),transparent_35%),radial-gradient(ellipse_at_80%_30%,rgba(139,92,246,.08),transparent_28%)]" />
      <div className="relative z-10 mx-auto max-w-[1780px] p-4 sm:p-6">
        <header className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_25px_rgba(59,130,246,.28)]">
              <Layers3 className="h-5 w-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white">
                  ApexVault
                </h1>
                <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                  ENTERPRISE
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-500">
                CLOUD BANKING PLATFORM / ACCOUNT OPERATIONS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-[10px] text-slate-400 hover:text-white">
              <Command className="h-3.5 w-3.5" /> COMMAND PALETTE
            </button>
            <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400">
              <Bell className="h-4 w-4" />
              <i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-400" />
            </button>
            <button className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-500 px-3 text-xs font-semibold text-white transition hover:bg-blue-400 active:scale-[.98]">
              <Plus className="h-3.5 w-3.5" /> New account
            </button>
          </div>
        </header>
        <TelemetryRibbon />
        <div className="mt-5 grid gap-5 xl:grid-cols-4">
          <section className="space-y-5 xl:col-span-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-slate-500">
                Global custody console
              </p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Account &amp; ledger management
                </h2>
                <span className="font-mono text-[10px] text-emerald-400">
                  ● LIVE RECONCILIATION ENABLED
                </span>
              </div>
            </div>
            <CustodyHub />
            <LedgerTable />
          </section>
          <LifecyclePanel />
        </div>
      </div>
    </main>
  );
}
