'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardNav } from '@/components/DashboardNav';
import { AccountType } from '@banking/shared-types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, customer, accounts, transactions, totalBalanceMinor, isLoading, createAccount, refreshAccounts } = useAuth();
  const [isOpeningAccount, setIsOpeningAccount] = useState(false);
  const [selectedType, setSelectedType] = useState<AccountType>(AccountType.SAVINGS);
  const [createError, setCreateError] = useState('');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Redirect unauthenticated users — must be in useEffect, not render body
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading your banking workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Still rendering null while the useEffect redirect is in flight
    return null;
  }

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      await createAccount({ type: selectedType });
      setIsOpeningAccount(false);
      await refreshAccounts();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account. You may already have an active account of this type.');
    }
  };

  const copyToClipboard = (accountNum: string) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedAccount(accountNum);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const displayName = customer?.firstName || user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Net Worth Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800 border border-slate-800 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {user.role} PORTAL
                </span>
                <span className="text-xs text-slate-400">
                  Customer ID: <code className="text-slate-300 font-mono">{user.id.substring(0, 10)}...</code>
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Good day, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{displayName}</span> 👋
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Here is your live banking overview and account activity.
              </p>
            </div>

            {/* Total Balance Card */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-sm min-w-[260px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Worth</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  ₹{(totalBalanceMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-emerald-400">INR</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Action Navigation Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/dashboard/deposit"
            className="flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Deposit</p>
              <p className="text-xs text-slate-400">Add funds</p>
            </div>
          </Link>

          <Link
            href="/dashboard/transfer"
            className="flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-850 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Transfer</p>
              <p className="text-xs text-slate-400">Send money</p>
            </div>
          </Link>

          <Link
            href="/dashboard/withdraw"
            className="flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Withdraw</p>
              <p className="text-xs text-slate-400">Cash / Payout</p>
            </div>
          </Link>

          <button
            onClick={() => setIsOpeningAccount(true)}
            className="flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-400/50 hover:bg-slate-850 transition-all group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">New Account</p>
              <p className="text-xs text-slate-400">Open account</p>
            </div>
          </button>
        </section>

        {/* Modal: Open New Account */}
        {isOpeningAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <h2 className="text-xl font-bold text-white">Open a New Bank Account</h2>
              <p className="text-slate-400 text-sm mt-1">Select an account type to generate a dedicated bank account.</p>

              {createError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleOpenAccount} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Account Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[AccountType.SAVINGS, AccountType.CURRENT, AccountType.SALARY].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          selectedType === type
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpeningAccount(false);
                      setCreateError('');
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Confirm & Open
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bank Accounts Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Your Bank Accounts</h2>
              <p className="text-xs text-slate-400">Manage savings, current, and salary balances.</p>
            </div>
            <Link
              href="/dashboard/accounts"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View All Accounts →
            </Link>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/40">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                🏦
              </div>
              <h3 className="text-base font-bold text-white">No active bank accounts</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                Open your first savings or current account in seconds to begin making deposits and transfers.
              </p>
              <button
                onClick={() => setIsOpeningAccount(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer"
              >
                + Open Primary Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map((acc) => (
                <div
                  key={acc.id || acc.accountNumber}
                  className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {acc.type}
                      </span>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="font-mono text-sm font-bold text-slate-300 tracking-wider">
                          {acc.accountNumber}
                        </span>
                        <button
                          onClick={() => copyToClipboard(acc.accountNumber)}
                          className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                          title="Copy Account Number"
                        >
                          {copiedAccount === acc.accountNumber ? '✓ Copied' : '📋'}
                        </button>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        acc.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <p className="text-[11px] font-medium text-slate-400">Available Balance</p>
                    <p className="text-2xl font-black text-white tracking-tight mt-0.5">
                      ₹{((acc.balanceMinor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Link
                      href={`/dashboard/deposit?account=${acc.accountNumber}`}
                      className="py-1.5 rounded-lg bg-slate-800 text-center text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Deposit
                    </Link>
                    <Link
                      href={`/dashboard/transfer?account=${acc.accountNumber}`}
                      className="py-1.5 rounded-lg bg-slate-800 text-center text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Transfer
                    </Link>
                    <Link
                      href={`/dashboard/withdraw?account=${acc.accountNumber}`}
                      className="py-1.5 rounded-lg bg-slate-800 text-center text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Withdraw
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Transactions Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <p className="text-xs text-slate-400">Real-time ledger updates & transfers.</p>
            </div>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View Full Statement →
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-400 text-xs">
              No transactions recorded yet. Make a deposit or transfer to see activity.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
              {transactions.slice(0, 5).map((txn) => {
                const isCredit = txn.type === 'DEPOSIT';
                const formattedDate = new Date(txn.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={txn.id || txn.transactionId} className="p-4 flex items-center justify-between hover:bg-slate-850/50 transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : txn.type === 'TRANSFER'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isCredit ? '↓' : txn.type === 'TRANSFER' ? '⇄' : '↑'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{txn.description || txn.type}</p>
                        <p className="text-xs text-slate-400">
                          {formattedDate} • <span className="font-mono">{txn.transactionId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-black font-mono ${
                          isCredit ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        {isCredit ? '+' : '-'}₹{(txn.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          txn.status === 'COMPLETED'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : txn.status === 'PENDING'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {txn.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
