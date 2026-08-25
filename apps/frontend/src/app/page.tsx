import React from 'react';
import Link from 'next/link';
import { 
  Zap, 
  ShieldCheck, 
  Server, 
  Database, 
  Cpu, 
  Activity, 
  Layers, 
  ArrowUpRight, 
  GitBranch, 
  CheckCircle2,
  Terminal
} from 'lucide-react';

const microservices = [
  { name: 'Auth Service', port: 4001, grpc: 50051, role: 'Authentication, JWT & 2FA', status: 'Ready' },
  { name: 'Customer Service', port: 4002, grpc: 50052, role: 'Profiles & Customer Data', status: 'Ready' },
  { name: 'Account Service', port: 4003, grpc: 50053, role: 'Accounts, Tier & Balances', status: 'Ready' },
  { name: 'Transaction Service', port: 4004, grpc: 50054, role: 'Core Transaction Engine', status: 'Ready' },
  { name: 'Ledger Service', port: 4005, grpc: 50055, role: 'Double-Entry Audit Ledger', status: 'Ready' },
  { name: 'Payment Service', port: 4006, grpc: 50056, role: 'Payment Gateway Integration', status: 'Ready' },
  { name: 'Wallet Service', port: 4007, grpc: 50057, role: 'Digital Wallets & Stored Value', status: 'Ready' },
  { name: 'Beneficiary Service', port: 4008, grpc: 50058, role: 'Payees & Counterparties', status: 'Ready' },
  { name: 'Notification Service', port: 4009, grpc: 50059, role: 'Event Alerts, SMS & Email', status: 'Ready' },
  { name: 'KYC & Risk Service', port: 4010, grpc: 50060, role: 'Risk Scoring & AML Checks', status: 'Ready' },
  { name: 'Reporting Service', port: 4011, grpc: 50061, role: 'Statements & Analytics', status: 'Ready' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white p-6 sm:p-12">
      {/* Background Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[2px] shadow-xl shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Nova<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Bank</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                  Phase 1 Foundation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cloud-Native Banking Microservices Platform
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-slate-200 font-medium transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-indigo-500/25 transition"
            >
              Open Account
            </Link>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Phase 2 Live • Auth + Customer + Kafka Event Mesh</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Identity, Redis Sessions & Decoupled Customer Profiles
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time authentication engine powered by Argon2, 15-minute stateless JWTs, rotating 7-day refresh tokens, Redis session stores, and asynchronous Kafka <code>user.registered</code> event processing for decoupled customer onboarding.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition"
              >
                <span>Register New Customer</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold transition"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>

          {/* Quick Infrastructure Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
              <Database className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-xs font-semibold text-white">MongoDB 8</p>
              <p className="text-[11px] text-slate-400">Port 27017</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
              <Cpu className="w-5 h-5 text-rose-400 mb-2" />
              <p className="text-xs font-semibold text-white">Redis 8</p>
              <p className="text-[11px] text-slate-400">Port 6379</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
              <Layers className="w-5 h-5 text-indigo-400 mb-2" />
              <p className="text-xs font-semibold text-white">Apache Kafka</p>
              <p className="text-[11px] text-slate-400">Port 9092</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
              <Server className="w-5 h-5 text-cyan-400 mb-2" />
              <p className="text-xs font-semibold text-white">API Gateway</p>
              <p className="text-[11px] text-slate-400">Port 3000</p>
            </div>
          </div>
        </section>

        {/* 11 Microservices Mesh Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Microservices Catalog (11 Services)</span>
            </h3>
            <span className="text-xs text-slate-400">Standardized NestJS + Health Probes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {microservices.map((svc) => (
              <div 
                key={svc.name}
                className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition duration-200 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                    {svc.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {svc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{svc.role}</p>
                <div className="pt-3 border-t border-white/5 flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>HTTP :{svc.port}</span>
                  <span>gRPC :{svc.grpc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Developer Commands / Next Step */}
        <section className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Next Phase: Phase 2 → Auth + Customer Services</p>
              <p className="text-xs text-slate-400">JWT Access/Refresh, MongoDB Schemas, Redis Sessions & Full Auth Flow</p>
            </div>
          </div>
          <div className="text-xs font-mono px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-cyan-300">
            pnpm dev
          </div>
        </section>

      </div>
    </main>
  );
}
