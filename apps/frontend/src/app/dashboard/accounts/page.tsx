"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardNav } from "@/components/DashboardNav";
import { AccountType } from "@banking/shared-types";

export default function AccountsPage() {
  const router = useRouter();
  const {
    user,
    accounts,
    totalBalanceMinor,
    isLoading,
    createAccount,
    refreshAccounts,
  } = useAuth();
  const [isOpeningModal, setIsOpeningModal] = useState(false);
  const [selectedType, setSelectedType] = useState<AccountType>(
    AccountType.SAVINGS,
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      await createAccount({ type: selectedType });
      setIsOpeningModal(false);
      await refreshAccounts();
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          "Failed to create account. You may already have an active account of this type.",
      );
    }
  };

  const copyToClipboard = (accountNum: string) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedAccount(accountNum);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              My Bank Accounts
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              View account balances, deposit limits, and active multi-currency
              services.
            </p>
          </div>
          <button
            onClick={() => setIsOpeningModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>+ Open New Account</span>
          </button>
        </div>

        {/* Total Assets Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Liquid Balance
            </p>
            <p className="text-3xl font-black text-white mt-1">
              ₹
              {(totalBalanceMinor / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {accounts.length} Active{" "}
              {accounts.length === 1 ? "Account" : "Accounts"}
            </span>
          </div>
        </div>

        {/* Modal: Open Account */}
        {isOpeningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <h2 className="text-xl font-bold text-white">
                Create New Account
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Select the account category you wish to open:
              </p>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreate} className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    AccountType.SAVINGS,
                    AccountType.CURRENT,
                    AccountType.SALARY,
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedType === type
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpeningModal(false);
                      setErrorMsg("");
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Accounts List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div
              key={acc.id || acc.accountNumber}
              className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between shadow-xl hover:border-slate-700 transition-all relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {acc.type} ACCOUNT
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      acc.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {acc.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Account Number
                    </p>
                    <p className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                      {acc.accountNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(acc.accountNumber)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                    title="Copy Account Number"
                  >
                    {copiedAccount === acc.accountNumber ? "✓" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-xs text-slate-400">Total Balance</p>
                    <p className="text-2xl font-black text-white tracking-tight mt-0.5">
                      ₹
                      {((acc.balanceMinor || 0) / 100).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Available</p>
                    <p className="text-sm font-bold text-emerald-400">
                      ₹
                      {((acc.availableBalanceMinor || 0) / 100).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <Link
                    href={`/dashboard/deposit?account=${acc.accountNumber}`}
                    className="py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center text-xs font-bold hover:bg-emerald-500/20 transition-all"
                  >
                    Deposit
                  </Link>
                  <Link
                    href={`/dashboard/transfer?account=${acc.accountNumber}`}
                    className="py-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-center text-xs font-bold hover:bg-teal-500/20 transition-all"
                  >
                    Transfer
                  </Link>
                  <Link
                    href={`/dashboard/withdraw?account=${acc.accountNumber}`}
                    className="py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-center text-xs font-bold hover:bg-cyan-500/20 transition-all"
                  >
                    Withdraw
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
