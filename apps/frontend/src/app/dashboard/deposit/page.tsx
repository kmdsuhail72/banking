"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardNav } from "@/components/DashboardNav";
import { api } from "@/lib/api";

function DepositForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accounts, isLoading, refreshAccounts, refreshTransactions } =
    useAuth();

  const [selectedAccount, setSelectedAccount] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [description, setDescription] = useState("Online Deposit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [receipt, setReceipt] = useState<any | null>(null);

  useEffect(() => {
    const queryAcc = searchParams.get("account");
    if (queryAcc) {
      setSelectedAccount(queryAcc);
    } else if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].accountNumber);
    }
  }, [accounts, searchParams, selectedAccount]);

  // Redirect during render is illegal — use useEffect
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const presetAmounts = [500, 1000, 5000, 10000, 50000];
  const numAmount = parseFloat(amountRupees) || 0;
  const amountMinor = Math.round(numAmount * 100);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedAccount) {
      setErrorMsg("Please select an account");
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg("Please enter an amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey =
      "DEP-" +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);

    try {
      const res = await api<any>("/api/v1/transactions/deposit", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          amountMinor,
          description: description.trim() || "Online Deposit",
        }),
      });

      setReceipt(res);
      await Promise.all([refreshAccounts(), refreshTransactions()]);
    } catch (err: any) {
      setErrorMsg(err.message || "Deposit failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
            Deposit Funds
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Add money directly into your savings or current account.
          </p>
        </div>

        {receipt ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xl flex items-center justify-center mx-auto animate-bounce">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Deposit Successful!
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Funds have been credited to your account.
              </p>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-3 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Transaction Reference</span>
                <span className="font-mono font-bold text-slate-200">
                  {receipt.transactionId}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Account Number</span>
                <span className="font-mono text-slate-200">
                  {receipt.accountId}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Amount Credited</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹
                  {(receipt.amountMinor / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-400 uppercase">
                  {receipt.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-2">
              <button
                onClick={() => {
                  setReceipt(null);
                  setAmountRupees("");
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Make Another Deposit
              </button>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-all cursor-pointer"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDeposit} className="space-y-6">
              {/* Account Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Destination Account
                </label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-rose-400">
                    No active accounts found. Please open an account first.
                  </p>
                ) : (
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
                  >
                    {accounts.map((acc) => (
                      <option
                        key={acc.id || acc.accountNumber}
                        value={acc.accountNumber}
                      >
                        {acc.type} — {acc.accountNumber} (Bal: ₹
                        {((acc.balanceMinor || 0) / 100).toLocaleString(
                          "en-IN",
                        )}
                        )
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Deposit Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-lg font-bold text-slate-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {presetAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountRupees(amt.toString())}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                    >
                      +₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                {numAmount > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Minor units:{" "}
                    <span className="font-mono text-emerald-400 font-bold">
                      {amountMinor.toLocaleString()} paise
                    </span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Description / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salary, Cash Deposit, Savings"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || accounts.length === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-base hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting
                  ? "Processing Deposit..."
                  : `Deposit ₹${numAmount > 0 ? numAmount.toLocaleString("en-IN") : "0.00"}`}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <DepositForm />
    </Suspense>
  );
}
