'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Zap, 
  User, 
  ShieldCheck, 
  LogOut, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  FileText, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, customer, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading banking dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = customer?.firstName 
    ? `${customer.firstName} ${customer.lastName}`
    : user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-16">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1.5px]">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <span className="text-lg font-black tracking-tight text-white hidden sm:inline">
                Nova<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Bank</span>
              </span>
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
              Customer Portal
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/profile"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 transition text-xs text-slate-300"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[120px] truncate">{displayName}</span>
            </Link>

            <button
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8 relative z-10">
        
        {/* Welcome & KYC Status Banner */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Welcome back,</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold">
                {user.role}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>User ID:</span>
              <span className="font-mono text-slate-300">{user.id}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Email Status</p>
                <p className="text-xs font-semibold text-emerald-400">
                  {user.emailVerified ? 'Verified' : 'Pending Verification'}
                </p>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center space-x-2.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">KYC Status</p>
                <p className="text-xs font-semibold text-indigo-300">
                  {customer?.kycStatus || 'PENDING'}
                </p>
              </div>
            </div>

            <Link
              href="/profile"
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/20"
            >
              <span>Manage Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Quick Action Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/40 transition text-left group">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Send className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white">Transfer Funds</p>
            <p className="text-[11px] text-slate-400 mt-0.5">UPI, NEFT, IMPS (Phase 3)</p>
          </button>

          <button className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 transition text-left group">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white">Deposit</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Add balance (Phase 3)</p>
          </button>

          <button className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/40 transition text-left group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white">Virtual Cards</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Instant issue (Phase 3)</p>
          </button>

          <button className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-violet-500/40 transition text-left group">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white">Statements</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Audit reports (Phase 3)</p>
          </button>
        </section>

        {/* Two Columns: Customer Profile Details & Accounts Teaser */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Customer Profile Details (Col 1) */}
          <section className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/70 border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <User className="w-4 h-4 text-indigo-400" />
                <span>Customer Profile</span>
              </h2>
              <Link
                href="/profile"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                Edit
              </Link>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">Legal Name</p>
                <p className="font-semibold text-white mt-0.5">
                  {customer ? `${customer.firstName} ${customer.lastName}` : 'Not configured'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">Email Address</p>
                <p className="font-semibold text-white mt-0.5 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.email}</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">Phone Number</p>
                <p className="font-semibold text-white mt-0.5 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{customer?.phone || 'Add phone number'}</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">Address</p>
                <p className="font-semibold text-white mt-0.5 flex items-start space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span>
                    {customer?.address?.street
                      ? `${customer.address.street}, ${customer.address.city || ''} ${customer.address.state || ''} ${customer.address.country || ''}`
                      : 'No address added yet'}
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
                <span>Customer profile automatically generated from Kafka <code>user.registered</code> event.</span>
              </div>
            </div>
          </section>

          {/* Core Banking Accounts Teaser (Col 2 & 3) */}
          <section className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/70 border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Accounts & Stored Value (Phase 3 Core Engine)</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Phase 3 Teaser
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Savings Account Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950/60 border border-white/10 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Primary Savings Account</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Active</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">$24,850.00</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">AC: **** **** 4920</p>
                </div>
                <div className="pt-2 flex justify-between text-[11px] text-slate-400 border-t border-white/5">
                  <span>Interest APY: 4.85%</span>
                  <span className="text-indigo-400">Savings Tier 1</span>
                </div>
              </div>

              {/* Checking Account Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-950/60 border border-white/10 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Everyday Checking</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold">Active</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">$5,120.50</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">AC: **** **** 8812</p>
                </div>
                <div className="pt-2 flex justify-between text-[11px] text-slate-400 border-t border-white/5">
                  <span>Routing: 121000358</span>
                  <span className="text-cyan-400">Zero Fees</span>
                </div>
              </div>
            </div>

            {/* Architecture summary banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Phase 2 Authentication, Sessions & Customer Profile Active</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Next: Phase 3 Accounts & Kafka Ledger</span>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}
