import {
  ArrowUpRight,
  CircleDollarSign,
  LockKeyhole,
  WalletCards,
} from "lucide-react";

const pools = [
  {
    title: "Fiat liquidity",
    subtitle: "USD · EUR settlement accounts",
    icon: CircleDollarSign,
    total: "$12,842,391.30",
    available: "$11,906,472.18",
    locked: "$935,919.12",
    tint: "blue",
  },
  {
    title: "Web3 custody",
    subtitle: "BTC · ETH · USDC vaults",
    icon: WalletCards,
    total: "$8,490,214.09",
    available: "$7,980,004.15",
    locked: "$510,209.94",
    tint: "purple",
  },
];

export function CustodyHub() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {pools.map((pool) => {
        const Icon = pool.icon;
        const isBlue = pool.tint === "blue";
        return (
          <article
            key={pool.title}
            className={`relative overflow-hidden rounded-2xl border ${isBlue ? "border-blue-500/20" : "border-violet-500/20"} bg-slate-900/70 p-5 shadow-2xl`}
          >
            <div
              className={`absolute -right-14 -top-16 h-44 w-44 rounded-full blur-3xl ${isBlue ? "bg-blue-500/10" : "bg-violet-500/10"}`}
            />
            <div className="relative">
              <header className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${isBlue ? "border-blue-400/20 bg-blue-500/10 text-blue-300" : "border-violet-400/20 bg-violet-500/10 text-violet-300"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                      {pool.title}
                    </h2>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                      {pool.subtitle}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                  <i className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />{" "}
                  SYNCED
                </span>
              </header>
              <div className="mt-6">
                <p className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">
                  Total balance
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {pool.total}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                  <p className="text-[10px] text-slate-500">
                    Available balance
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-slate-200 tabular-nums">
                    {pool.available}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                  <p className="flex items-center gap-1 text-[10px] text-slate-500">
                    <LockKeyhole className="h-2.5 w-2.5" /> Locked holds
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-amber-300 tabular-nums">
                    {pool.locked}
                  </p>
                </div>
              </div>
              <footer className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="font-mono text-[10px] text-slate-500">
                  {isBlue ? "wallet-service :4007" : "ledger-service :4005"}
                </span>
                <button
                  className={`flex items-center gap-1 text-xs font-semibold ${isBlue ? "text-blue-400" : "text-violet-400"}`}
                >
                  Inspect pool <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </footer>
            </div>
          </article>
        );
      })}
    </section>
  );
}
