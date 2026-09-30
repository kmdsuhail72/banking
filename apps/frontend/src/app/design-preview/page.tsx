"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Copy,
  CreditCard,
  Home,
  Landmark,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";

const transactions = [
  {
    name: "Acme Technologies",
    detail: "Salary · Today, 09:30",
    amount: "+₹2,10,000.00",
    credit: true,
    mark: "A",
  },
  {
    name: "Whole Foods Market",
    detail: "Groceries · Yesterday",
    amount: "−₹4,280.50",
    credit: false,
    mark: "W",
  },
  {
    name: "Netflix India",
    detail: "Entertainment · Sep 8",
    amount: "−₹649.00",
    credit: false,
    mark: "N",
  },
  {
    name: "Priya Sharma",
    detail: "Transfer received · Sep 7",
    amount: "+₹12,500.00",
    credit: true,
    mark: "P",
  },
];

const navItems = [
  { label: "Overview", icon: Home, href: "/design-preview" },
  { label: "Accounts", icon: Wallet, href: "/dashboard/accounts" },
  { label: "Payments", icon: Send, href: "/dashboard/transfer" },
  { label: "Cards", icon: CreditCard, href: "/dashboard" },
  { label: "Settings", icon: Settings, href: "/profile" },
];

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function DesignPreviewPage() {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(true);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const copyAccount = async () => {
    await navigator.clipboard?.writeText("NB••••••••7890");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[252px] shrink-0 flex-col border-r border-slate-200 bg-white p-5 lg:flex">
          <Link
            href="/"
            className="mb-10 flex items-center gap-3 px-2"
            aria-label="Nova Bank home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-indigo-200">
              N
            </span>
            <span className="text-lg font-bold tracking-tight">
              nova<span className="text-indigo-600">bank</span>
            </span>
          </Link>

          <nav className="space-y-1" aria-label="Primary navigation">
            {navItems.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${label === "Overview" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
                {label === "Payments" && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> All
              systems operational
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Your accounts are protected by bank-grade encryption.
            </p>
          </div>
          <Link
            href="/profile"
            className="mt-4 flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-bold text-rose-700">
              AM
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                Arjun Mehta
              </span>
              <span className="block truncate text-xs text-slate-500">
                Personal account
              </span>
            </span>
            <MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-5 sm:px-8 lg:px-10 lg:py-7">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-black text-white">
                N
              </span>
              <span className="font-bold">novabank</span>
            </div>
            <label className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Search accounts, payments, or help"
                aria-label="Search"
              />
              <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400">
                ⌘ K
              </kbd>
            </label>
            <div className="ml-auto flex items-center gap-3">
              <button
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>
              <Link
                href="/profile"
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-bold text-rose-700 lg:hidden"
              >
                AM
              </Link>
            </div>
          </header>

          {notice && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" /> Your September
                statement is ready to view.
              </span>
              <button
                onClick={() => setNotice(false)}
                className="text-xs font-semibold text-indigo-700"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">
                {monthLabel}
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Good morning, Arjun <span aria-hidden>👋</span>
              </h1>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" /> Secured
              with 256-bit encryption
            </span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.45fr_.9fr]">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-200 sm:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
              <div className="relative">
                <div className="mb-8 flex items-center justify-between">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    Primary balance
                  </span>
                  <button
                    onClick={copyAccount}
                    className="flex items-center gap-1.5 text-xs text-indigo-100 hover:text-white"
                  >
                    <Copy className="h-3.5 w-3.5" />{" "}
                    {copied ? "Copied" : "NB••••7890"}
                  </button>
                </div>
                <p className="text-sm font-medium text-indigo-100">
                  Available balance
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
                  {rupees(1582456)}
                </p>
                <p className="mt-2 text-sm text-indigo-100">
                  Savings account ·•••• 7890
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <Link
                    href="/dashboard/transfer"
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/15 px-3 py-3 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/25"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Link>
                  <Link
                    href="/dashboard/deposit"
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/15 px-3 py-3 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/25"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Add money
                  </Link>
                  <Link
                    href="/dashboard/accounts"
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white/15 px-3 py-3 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/25"
                  >
                    <Plus className="h-4 w-4" />
                    Open account
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,.06),0_8px_24px_rgba(15,23,42,.04)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Spending insights</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your activity this month
                  </p>
                </div>
                <button className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                  This month
                </button>
              </div>
              <div
                className="relative mx-auto grid h-40 w-40 place-items-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#4f46e5 0 42%, #8b5cf6 42% 68%, #f59e0b 68% 83%, #e2e8f0 83% 100%)",
                }}
              >
                <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                  <span className="text-xs text-slate-500">Spent</span>
                  <strong className="font-mono text-lg tabular-nums">
                    ₹42.8k
                  </strong>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <span className="text-slate-500">
                  <i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-600" />
                  Living
                </span>
                <span className="text-right font-semibold">42%</span>
                <span className="text-slate-500">
                  <i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />
                  Lifestyle
                </span>
                <span className="text-right font-semibold">26%</span>
              </div>
            </section>
          </div>

          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your accounts</h2>
                <p className="text-sm text-slate-500">
                  Everything in one calm, clear view.
                </p>
              </div>
              <Link
                href="/dashboard/accounts"
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <AccountCard
                name="Everyday Savings"
                number="•••• 7890"
                balance="₹15,82,456.00"
                tint="from-indigo-50 to-white"
                icon={Landmark}
              />
              <AccountCard
                name="Current Account"
                number="•••• 3210"
                balance="₹4,37,812.50"
                tint="from-violet-50 to-white"
                icon={CreditCard}
              />
              <Link
                href="/dashboard/accounts"
                className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center transition hover:border-indigo-400 hover:bg-indigo-50/30"
              >
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">
                  Open a new account
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Savings, current, or FD
                </span>
              </Link>
            </div>
          </section>

          <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,.06),0_8px_24px_rgba(15,23,42,.04)] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent activity</h2>
                <p className="text-sm text-slate-500">
                  Your latest account movements
                </p>
              </div>
              <Link
                href="/dashboard/transactions"
                className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 sm:flex"
              >
                All transactions <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div
                  key={tx.name}
                  className="flex items-center gap-3 py-4 first:pt-0"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-bold ${tx.credit ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {tx.mark}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{tx.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {tx.detail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-mono text-sm font-semibold tabular-nums ${tx.credit ? "text-emerald-600" : "text-slate-900"}`}
                    >
                      {tx.amount}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Completed</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function AccountCard({
  name,
  number,
  balance,
  tint,
  icon: Icon,
}: {
  name: string;
  number: string;
  balance: string;
  tint: string;
  icon: typeof Landmark;
}) {
  return (
    <div
      className={`min-h-[160px] rounded-2xl border border-slate-200 bg-gradient-to-br ${tint} p-5`}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold">{name}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-7 font-mono text-xl font-bold tabular-nums">{balance}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{number}</span>
        <span className="flex items-center gap-1 text-emerald-600">
          <ArrowUpRight className="h-3 w-3" /> 8.4%
        </span>
      </div>
    </div>
  );
}
