'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardNav } from '@/components/DashboardNav';
import { api } from '@/lib/api';
import { ITransaction, TransactionType, TransactionStatus } from '@banking/shared-types';

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactionsList = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await api<any>(`/api/v1/transactions?${params.toString()}`);
      setTransactions(res.data || []);
      setTotalCount(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch {
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    if (user) {
      fetchTransactionsList();
    }
  }, [user, fetchTransactionsList]);

  // Redirect during render is illegal — use useEffect
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredTransactions = transactions.filter((txn) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      txn.transactionId.toLowerCase().includes(query) ||
      (txn.description && txn.description.toLowerCase().includes(query)) ||
      txn.accountId.toLowerCase().includes(query) ||
      (txn.destinationAccountId && txn.destinationAccountId.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Transaction Statement</h1>
            <p className="text-slate-400 text-sm mt-1">Audit log of all credits, debits, and transfers.</p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/transfer"
              className="px-4 py-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-bold hover:bg-teal-500/20 transition-all"
            >
              Transfer
            </Link>
            <Link
              href="/dashboard/deposit"
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              + Deposit Funds
            </Link>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Type Filter Buttons */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {['ALL', 'DEPOSIT', 'TRANSFER', 'WITHDRAWAL'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setTypeFilter(tab);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  typeFilter === tab
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab === 'ALL' ? 'All Operations' : tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Search reference, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all min-w-[220px]"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-400 text-xs">Loading ledger entries...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No transactions match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                    <th className="py-3.5 px-4 font-semibold">Type</th>
                    <th className="py-3.5 px-4 font-semibold">Reference ID</th>
                    <th className="py-3.5 px-4 font-semibold">Description</th>
                    <th className="py-3.5 px-4 font-semibold">Account(s)</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Amount (INR)</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTransactions.map((txn) => {
                    const isCredit = txn.type === 'DEPOSIT';
                    const formattedDate = new Date(txn.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={txn.id || txn.transactionId} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-4 px-4 text-slate-400 whitespace-nowrap">{formattedDate}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : txn.type === 'TRANSFER'
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-300 font-bold whitespace-nowrap">
                          {txn.transactionId}
                        </td>
                        <td className="py-4 px-4 text-slate-200 font-medium max-w-xs truncate">
                          {txn.description || '—'}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {txn.type === 'TRANSFER' ? (
                            <span>
                              {txn.accountId} → <span className="text-teal-400">{txn.destinationAccountId}</span>
                            </span>
                          ) : (
                            <span>{txn.accountId}</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-sm whitespace-nowrap">
                          <span className={isCredit ? 'text-emerald-400' : 'text-slate-100'}>
                            {isCredit ? '+' : '-'}₹{(txn.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              txn.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : txn.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {filteredTransactions.length} of {totalCount} transactions
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
