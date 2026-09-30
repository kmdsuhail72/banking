'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardNav } from '@/components/DashboardNav';
import { api } from '@/lib/api';

function TransferForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accounts, isLoading, refreshAccounts, refreshTransactions } = useAuth();

  const [sourceAccountNum, setSourceAccountNum] = useState('');
  const [destAccountNum, setDestAccountNum] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'FORM' | 'CONFIRM' | 'SUCCESS'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<any | null>(null);

  useEffect(() => {
    const queryAcc = searchParams.get('account');
    if (queryAcc) {
      setSourceAccountNum(queryAcc);
    } else if (accounts.length > 0 && !sourceAccountNum) {
      setSourceAccountNum(accounts[0].accountNumber);
    }
  }, [accounts, searchParams, sourceAccountNum]);

  // Redirect during render is illegal — use useEffect
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
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

  const selectedSourceAccount = accounts.find((a) => a.accountNumber === sourceAccountNum);
  const availableBalanceMinor = selectedSourceAccount?.availableBalanceMinor || 0;
  const numAmount = parseFloat(amountRupees) || 0;
  const amountMinor = Math.round(numAmount * 100);
  const isOverdraft = amountMinor > availableBalanceMinor;
  const isSameAccount =
    sourceAccountNum &&
    destAccountNum &&
    sourceAccountNum.trim().toUpperCase() === destAccountNum.trim().toUpperCase();

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sourceAccountNum) {
      setErrorMsg('Please select a source account');
      return;
    }
    if (!destAccountNum.trim()) {
      setErrorMsg('Please enter a destination account number');
      return;
    }
    if (isSameAccount) {
      setErrorMsg('Source and destination accounts must be different');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Please enter an amount greater than 0');
      return;
    }
    if (isOverdraft) {
      setErrorMsg('Transfer amount exceeds available account balance');
      return;
    }

    setStep('CONFIRM');
  };

  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    const idempotencyKey = 'TRF-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    try {
      const res = await api<any>('/api/v1/transactions/transfer', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          sourceAccountId: sourceAccountNum,
          destinationAccountId: destAccountNum.trim(),
          amountMinor,
          description: description.trim() || `Transfer to ${destAccountNum.trim()}`,
        }),
      });

      setReceipt(res);
      setStep('SUCCESS');
      await Promise.all([refreshAccounts(), refreshTransactions()]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Transfer failed. Please check the recipient details and balance.');
      setStep('FORM');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DashboardNav />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">Transfer Money</h1>
          <p className="text-slate-400 text-sm mt-1">Instant, zero-fee fund transfers across NovaBank accounts.</p>
        </div>

        {/* STEP 1: FORM */}
        {step === 'FORM' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleProceedToConfirm} className="space-y-6">
              {/* Source Account */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  From Account
                </label>
                <select
                  value={sourceAccountNum}
                  onChange={(e) => setSourceAccountNum(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id || acc.accountNumber} value={acc.accountNumber}>
                      {acc.type} — {acc.accountNumber} (Available: ₹{((acc.availableBalanceMinor || 0) / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                {selectedSourceAccount && (
                  <p className="text-xs text-slate-400 mt-2">
                    Available: <span className="font-bold text-emerald-400">₹{(availableBalanceMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </p>
                )}
              </div>

              {/* Destination Account */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  To Account Number (Recipient)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SB1000098765, CA1000054321"
                  value={destAccountNum}
                  onChange={(e) => setDestAccountNum(e.target.value.toUpperCase())}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-slate-100 text-sm font-mono focus:outline-none transition-all ${
                    isSameAccount ? 'border-rose-500 text-rose-400' : 'border-slate-800 focus:border-teal-500'
                  }`}
                />
                {isSameAccount && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">
                    ⚠ Cannot transfer to the same account.
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Amount to Transfer (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-lg font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-3 text-xl font-bold text-white placeholder-slate-600 focus:outline-none transition-all ${
                      isOverdraft ? 'border-rose-500 text-rose-400' : 'border-slate-800 focus:border-teal-500'
                    }`}
                  />
                </div>
                {isOverdraft && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">
                    ⚠ Insufficient account balance
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Description / Payment Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rent, Split Bills, Payment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isOverdraft || isSameAccount || numAmount <= 0 || !destAccountNum.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-extrabold text-base hover:from-teal-400 hover:to-emerald-400 transition-all shadow-xl shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
              >
                Review Transfer Details →
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: CONFIRMATION */}
        {step === 'CONFIRM' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white">Confirm Transfer Details</h2>
            <p className="text-slate-400 text-xs">Please review the transfer information carefully before authorizing.</p>

            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex justify-between text-xs pb-3 border-b border-slate-850">
                <span className="text-slate-400">From Account</span>
                <span className="font-mono font-bold text-slate-200">{sourceAccountNum}</span>
              </div>
              <div className="flex justify-between text-xs pb-3 border-b border-slate-850">
                <span className="text-slate-400">To Recipient Account</span>
                <span className="font-mono font-bold text-teal-400">{destAccountNum}</span>
              </div>
              <div className="flex justify-between text-xs pb-3 border-b border-slate-850">
                <span className="text-slate-400">Transfer Amount</span>
                <span className="font-mono font-bold text-white text-base">
                  ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs pb-3 border-b border-slate-850">
                <span className="text-slate-400">Platform Transfer Fee</span>
                <span className="font-bold text-emerald-400">₹0.00 (Zero Fee)</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="font-bold text-slate-300">Total to Deduct</span>
                <span className="font-mono font-extrabold text-white text-lg">
                  ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('FORM')}
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-colors cursor-pointer mr-2"
              >
                Back / Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer ml-2"
              >
                {isSubmitting ? 'Transferring Funds...' : 'Authorize & Send'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS RECEIPT */}
        {step === 'SUCCESS' && receipt && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xl flex items-center justify-center mx-auto">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Transfer Successful!</h2>
              <p className="text-sm text-slate-400 mt-1">Funds have been transferred to the recipient account.</p>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-3 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Transaction ID</span>
                <span className="font-mono font-bold text-slate-200">{receipt.transactionId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sender Account</span>
                <span className="font-mono text-slate-200">{receipt.accountId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Recipient Account</span>
                <span className="font-mono font-bold text-teal-400">{receipt.destinationAccountId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Amount Transferred</span>
                <span className="font-mono font-bold text-white text-base">
                  ₹{(receipt.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-400 uppercase">{receipt.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-2">
              <button
                onClick={() => {
                  setReceipt(null);
                  setAmountRupees('');
                  setDestAccountNum('');
                  setDescription('');
                  setStep('FORM');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Send Another Transfer
              </button>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-all cursor-pointer"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TransferPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <TransferForm />
    </Suspense>
  );
}
