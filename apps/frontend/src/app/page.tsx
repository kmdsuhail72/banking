"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ObservabilityStatus } from "@/components/ObservabilityStatus";
import { ServiceHealthCatalog } from "@/components/ServiceHealthCatalog";
import { GitOpsShowcase } from "@/components/GitOpsShowcase";
import {
  Zap,
  Shield,
  Server,
  Database,
  Cpu,
  Activity,
  Layers,
  Check,
  Copy,
  Terminal,
  ArrowRight,
  ExternalLink,
  Lock,
  GitBranch,
  Boxes,
  Radio,
  Sparkles,
  Workflow,
  Code2,
} from "lucide-react";

/* ─────────────────────────────────────────────
   SERVICES DATA (11 Microservices)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   KAFKA EVENT STREAM EXAMPLES
───────────────────────────────────────────── */
interface KafkaEvent {
  topic: string;
  partition: number;
  offset: string;
  source: string;
  consumer: string;
  payload: string;
}

const KAFKA_EVENTS: Record<string, KafkaEvent> = {
  "user.registered": {
    topic: "banking.events.auth.user-registered.v1",
    partition: 2,
    offset: "00482914",
    source: "AuthService (4001)",
    consumer: "CustomerService (4002) + Notification (4009)",
    payload: `{\n  "eventId": "evt_9a4f210d",\n  "eventType": "USER_REGISTERED",\n  "timestamp": "2026-09-06T00:30:15.192Z",\n  "data": {\n    "userId": "usr_c8914b1e",\n    "email": "arjun.mehta@novabank.demo",\n    "role": "CUSTOMER",\n    "status": "ACTIVE"\n  }\n}`,
  },
  "account.credited": {
    topic: "banking.events.account.balance-credited.v1",
    partition: 1,
    offset: "00918231",
    source: "AccountService (4003)",
    consumer: "LedgerService (4005) + Notification (4009)",
    payload: `{\n  "eventId": "evt_883e49bc",\n  "eventType": "ACCOUNT_CREDITED",\n  "timestamp": "2026-09-06T00:32:44.801Z",\n  "data": {\n    "accountId": "NB10001234567890",\n    "amountMinor": 21000000,\n    "currency": "INR",\n    "reference": "SALARY-SEP-2026"\n  }\n}`,
  },
  "transfer.initiated": {
    topic: "banking.events.transaction.transfer-initiated.v1",
    partition: 0,
    offset: "01249502",
    source: "TransactionService (4004)",
    consumer: "KYCRiskService (4010) + LedgerService (4005)",
    payload: `{\n  "eventId": "evt_5f18c21a",\n  "eventType": "TRANSFER_INITIATED",\n  "timestamp": "2026-09-06T00:35:10.420Z",\n  "data": {\n    "transactionId": "TXN990142",\n    "sourceAccount": "NB10005555444433",\n    "destinationAccount": "NB10009876543210",\n    "amountMinor": 4500000,\n    "idempotencyKey": "ik_trf_8a39f"\n  }\n}`,
  },
};

/* ─────────────────────────────────────────────
   QUICKSTART TABS DATA
───────────────────────────────────────────── */
interface QuickstartTab {
  id: string;
  label: string;
  step: string;
  command: string;
  annotation: string;
  outputLines: { text: string; color?: string }[];
  duration: string;
}

const QUICKSTART_TABS: QuickstartTab[] = [
  {
    id: "install",
    label: "1. Install Dependencies",
    step: "Step 01",
    command: "pnpm install",
    annotation:
      "Hydrates root workspace & 13 microservices/packages via PNPM hard links",
    duration: "2.4s",
    outputLines: [
      { text: "Scope: all 13 workspace packages", color: "text-slate-400" },
      {
        text: "Lockfile up to date, resolution successful",
        color: "text-slate-400",
      },
      { text: "Packages: +942 modules resolved", color: "text-emerald-400" },
      {
        text: "Progress: [====================================] 100%",
        color: "text-purple-400",
      },
      { text: "Done in 2.41s", color: "text-emerald-400 font-semibold" },
    ],
  },
  {
    id: "build",
    label: "2. Build Packages",
    step: "Step 02",
    command: "pnpm build",
    annotation:
      "Compiles shared-types, config, logger, observability & gRPC proto definitions",
    duration: "3.1s",
    outputLines: [
      {
        text: "@banking/shared-types: tsc --build -> dist/ (0 errors)",
        color: "text-emerald-400",
      },
      {
        text: "@banking/config: tsc --build -> dist/ (0 errors)",
        color: "text-emerald-400",
      },
      {
        text: "@banking/logger: Winston JSON format loaded",
        color: "text-slate-300",
      },
      {
        text: "@banking/grpc: Compiled proto definitions for 11 services",
        color: "text-purple-400",
      },
      {
        text: "Shared package compilation verified. 0 cycle warnings.",
        color: "text-emerald-400 font-semibold",
      },
    ],
  },
  {
    id: "infra",
    label: "3. Start Infra",
    step: "Step 03",
    command: "docker compose up -d",
    annotation:
      "Spins up MongoDB 8, Redis 8 Cluster, and Apache Kafka Event Broker",
    duration: "4.8s",
    outputLines: [
      { text: "[+] Running 4/4", color: "text-slate-400" },
      {
        text: " ✔ Container banking-mongodb-8     Healthy   [port 27017]",
        color: "text-emerald-400",
      },
      {
        text: " ✔ Container banking-redis-8       Healthy   [port 6379]",
        color: "text-emerald-400",
      },
      {
        text: " ✔ Container banking-kafka-broker  Healthy   [port 9092]",
        color: "text-emerald-400",
      },
      {
        text: " ✔ Container banking-zookeeper     Healthy   [port 2181]",
        color: "text-emerald-400",
      },
      {
        text: "All stateful services operational and listening on localhost.",
        color: "text-purple-300",
      },
    ],
  },
  {
    id: "dev",
    label: "4. Run Dev",
    step: "Step 04",
    command: "pnpm dev",
    annotation:
      "Launches API Gateway (:3000), Next.js 15 (:3001), and 11 NestJS nodes in parallel",
    duration: "1.8s",
    outputLines: [
      { text: "pnpm --parallel -r dev", color: "text-purple-400" },
      {
        text: "🚀 [API-Gateway]          Running on http://localhost:3000",
        color: "text-emerald-400",
      },
      {
        text: "▲  [@banking/frontend]    Next.js 15 ready on http://localhost:3001",
        color: "text-cyan-300",
      },
      {
        text: "👤 [Customer-Service]     Running on http://localhost:4002 | gRPC :50052",
        color: "text-slate-300",
      },
      {
        text: "💳 [Account-Service]      Running on http://localhost:4003 | gRPC :50053",
        color: "text-slate-300",
      },
      {
        text: "⚡ [Transaction-Service]  Running on http://localhost:4004 | gRPC :50054",
        color: "text-slate-300",
      },
      {
        text: "Kafka event bus connected. All 11 health probes returning 200 OK.",
        color: "text-emerald-400 font-semibold",
      },
    ],
  },
];

export default function LandingPage() {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedQuickstart, setCopiedQuickstart] = useState(false);
  const [activeQuickTab, setActiveQuickTab] = useState<string>("install");
  const [activeKafkaEvent, setActiveKafkaEvent] =
    useState<string>("user.registered");
  const [selectedDirectory, setSelectedDirectory] = useState<
    "apps" | "packages" | "infra"
  >("apps");
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Auto copy snippet
  const copyText = (text: string, isQuickstart = false) => {
    navigator.clipboard.writeText(text);
    if (isQuickstart) {
      setCopiedQuickstart(true);
      setTimeout(() => setCopiedQuickstart(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@") || !emailInput.includes(".")) {
      setEmailError("Please provide a valid engineering/corporate email.");
      return;
    }
    setEmailError("");
    setEmailSubmitted(true);
  };

  const activeTabDetails = QUICKSTART_TABS.find(
    (t) => t.id === activeQuickTab,
  )!;

  return (
    <div className="min-h-screen bg-[#080B10] text-[#F3F4F6] selection:bg-[#7C3AED]/30 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Gradients & Grid Pattern */}
      <div className="fixed inset-0 bg-dev-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-radial-purple pointer-events-none z-0" />
      <div className="fixed top-1/3 -right-40 w-[600px] h-[500px] bg-radial-emerald pointer-events-none z-0" />

      {/* ─────────────────────────────────────────────
          GLOBAL TOP NAVIGATION
      ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#080B10]/80 border-b border-[#1F2937]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Tag */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#6366F1] to-[#10B981] p-[1.5px] shadow-lg shadow-[#7C3AED]/20">
                <div className="w-full h-full bg-[#080B10] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-[#10B981] group-hover:scale-110 transition duration-150" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  Nova<span className="text-[#10B981]">Bank</span>
                </span>
                <span className="hidden sm:inline-block font-code text-[11px] text-[#9CA3AF] px-1.5 py-0.5 rounded bg-[#1F2937]/60 border border-[#374151]/50">
                  Engine v1.0
                </span>
              </div>
            </Link>

            {/* SLA Status Telemetry Badge */}
            <div className="hidden lg:flex items-center space-x-2 ml-4 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-[11px] font-code">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>11/11 Nodes Live</span>
              <span className="text-slate-500">•</span>
              <span>99.99% SLA</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-[#9CA3AF]">
            <a href="#services" className="hover:text-white transition">
              Services Catalog
            </a>
            <a href="#architecture" className="hover:text-white transition">
              Bento Architecture
            </a>
            <a href="#quickstart" className="hover:text-white transition">
              Local Quickstart
            </a>
            <a href="#compliance" className="hover:text-white transition">
              Enterprise Security
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1F2937] hover:border-[#374151] text-xs font-code text-[#E5E7EB] transition"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>★ 1,480</span>
            </a>

            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1F2937]/50 border border-transparent hover:border-[#374151] transition"
            >
              Sign In
            </Link>

            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white text-xs font-semibold shadow-lg shadow-[#7C3AED]/25 transition flex items-center space-x-1.5 group"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────
          1. HERO SECTION (Developer Sandbox Vibe)
      ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top pill badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1F2937]/70 border border-[#374151] text-xs font-code text-[#D1D5DB]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span className="text-[#10B981] font-semibold">
                Production-Ready
              </span>
              <span className="text-slate-600">/</span>
              <span>Next.js 15 • NestJS • Kafka Mesh</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              The Enterprise Cloud Banking Engine.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#10B981]">
                Production-Ready.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-[#9CA3AF] max-w-2xl font-normal leading-relaxed">
              A fully decoupled, hyper-scalable cloud-native banking
              microservices platform. Powered by Next.js 15, NestJS, MongoDB,
              Redis, and Apache Kafka. Move from local setup to multi-region
              cloud deployment in minutes.
            </p>

            {/* Action Row: Glowing Split Button + Secondary + Shell Snippet */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              {/* Glowing Split Primary Button */}
              <div className="inline-flex rounded-xl shadow-xl shadow-[#7C3AED]/30 glow-purple-sm p-[1px] bg-gradient-to-r from-[#7C3AED] to-[#10B981]">
                <Link
                  href="/dashboard"
                  className="px-5 py-3 rounded-l-[11px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-bold transition flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Deploy to Cloud</span>
                </Link>
                <Link
                  href="/login"
                  title="Explore live demo mode"
                  className="px-3.5 py-3 rounded-r-[11px] bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold border-l border-white/20 transition flex items-center"
                >
                  <span className="text-[11px] font-code text-purple-200">
                    Demo
                  </span>
                </Link>
              </div>

              {/* Secondary CTA */}
              <a
                href="#architecture"
                className="px-4 py-3 rounded-xl bg-[#111827] border border-[#1F2937] hover:border-[#374151] text-xs sm:text-sm font-semibold text-[#E5E7EB] hover:text-white transition flex items-center space-x-2"
              >
                <Boxes className="w-4 h-4 text-[#7C3AED]" />
                <span>Read Architecture Docs</span>
              </a>

              {/* Embedded Interactive Shell Snippet */}
              <div
                onClick={() => copyText("pnpm install && pnpm dev")}
                className="group relative flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#1F2937] hover:border-[#7C3AED]/60 cursor-pointer transition"
                title="Click to copy setup command"
              >
                <Terminal className="w-4 h-4 text-[#10B981]" />
                <code className="text-xs font-code text-[#D1D5DB] tracking-tight">
                  pnpm install && pnpm dev
                </code>
                <div className="p-1 rounded bg-[#1F2937]/50 text-[#9CA3AF] group-hover:text-white transition">
                  {copiedSnippet ? (
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </div>
                {copiedSnippet && (
                  <span className="absolute -top-7 right-2 text-[10px] font-code bg-[#10B981] text-slate-950 font-bold px-2 py-0.5 rounded shadow">
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* Engineering Metrics Row */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#1F2937]/80 max-w-lg">
              <div>
                <div className="text-xl sm:text-2xl font-black font-code text-white">
                  11
                </div>
                <div className="text-xs text-[#9CA3AF]">Microservices</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black font-code text-[#10B981]">
                  &lt; 0.8ms
                </div>
                <div className="text-xs text-[#9CA3AF]">gRPC Inter-node</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black font-code text-[#A78BFA]">
                  100%
                </div>
                <div className="text-xs text-[#9CA3AF]">TypeScript Strict</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Monorepo Explorer & Visual System Map */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-[#0B0F17]/90 border border-[#1F2937] shadow-2xl p-5 relative overflow-hidden backdrop-blur-xl">
              {/* Terminal Titlebar */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1F2937]">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]/80" />
                  <span className="text-xs font-code text-[#9CA3AF] ml-2">
                    cloud-banking-monorepo/
                  </span>
                </div>
                <span className="text-[10px] font-code px-2 py-0.5 rounded bg-[#1F2937] text-purple-300">
                  PNPM Workspace
                </span>
              </div>

              {/* Directory Navigator Tabs */}
              <div className="grid grid-cols-3 gap-2 py-3">
                <button
                  onClick={() => setSelectedDirectory("apps")}
                  className={`py-2 px-3 rounded-lg text-xs font-code transition flex items-center justify-center space-x-1.5 ${
                    selectedDirectory === "apps"
                      ? "bg-[#7C3AED]/20 border border-[#7C3AED] text-purple-300 font-bold"
                      : "bg-[#111827] border border-[#1F2937] text-slate-400 hover:text-white"
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>apps/ (13)</span>
                </button>
                <button
                  onClick={() => setSelectedDirectory("packages")}
                  className={`py-2 px-3 rounded-lg text-xs font-code transition flex items-center justify-center space-x-1.5 ${
                    selectedDirectory === "packages"
                      ? "bg-[#7C3AED]/20 border border-[#7C3AED] text-purple-300 font-bold"
                      : "bg-[#111827] border border-[#1F2937] text-slate-400 hover:text-white"
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>packages/ (6)</span>
                </button>
                <button
                  onClick={() => setSelectedDirectory("infra")}
                  className={`py-2 px-3 rounded-lg text-xs font-code transition flex items-center justify-center space-x-1.5 ${
                    selectedDirectory === "infra"
                      ? "bg-[#7C3AED]/20 border border-[#7C3AED] text-purple-300 font-bold"
                      : "bg-[#111827] border border-[#1F2937] text-slate-400 hover:text-white"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>infra/ (4)</span>
                </button>
              </div>

              {/* Dynamic Directory Contents */}
              <div className="mt-2 p-3.5 rounded-xl bg-[#080B10] border border-[#1F2937] font-code text-xs space-y-2.5 min-h-[260px]">
                {selectedDirectory === "apps" && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-[#1F2937]">
                      <span className="text-[#10B981] font-semibold">
                        📁 apps/api-gateway
                      </span>
                      <span className="text-[11px] text-[#9CA3AF]">
                        Port 3000 • Reverse Proxy
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-[#1F2937]">
                      <span className="text-cyan-400 font-semibold">
                        📁 apps/frontend
                      </span>
                      <span className="text-[11px] text-[#9CA3AF]">
                        Port 3001 • Next.js 15
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                      <div className="p-1.5 rounded bg-[#111827] border border-[#1F2937]/80">
                        <span className="text-white">auth-service</span>
                        <p className="text-[10px] text-purple-400">
                          :4001 / :50051
                        </p>
                      </div>
                      <div className="p-1.5 rounded bg-[#111827] border border-[#1F2937]/80">
                        <span className="text-white">customer-service</span>
                        <p className="text-[10px] text-purple-400">
                          :4002 / :50052
                        </p>
                      </div>
                      <div className="p-1.5 rounded bg-[#111827] border border-[#1F2937]/80">
                        <span className="text-white">account-service</span>
                        <p className="text-[10px] text-purple-400">
                          :4003 / :50053
                        </p>
                      </div>
                      <div className="p-1.5 rounded bg-[#111827] border border-[#1F2937]/80">
                        <span className="text-white">transaction-service</span>
                        <p className="text-[10px] text-purple-400">
                          :4004 / :50054
                        </p>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1 flex justify-between items-center">
                      <span>
                        + 7 more services (ledger, payment, wallet...)
                      </span>
                      <span className="text-[#10B981] font-bold">
                        11/11 healthy
                      </span>
                    </div>
                  </div>
                )}

                {selectedDirectory === "packages" && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <span className="text-purple-300 font-bold">
                        @banking/shared-types
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Zero-cycle Types
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <span className="text-purple-300 font-bold">
                        @banking/config
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Strict Joi validation
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <span className="text-purple-300 font-bold">
                        @banking/logger
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Winston correlation ID
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <span className="text-purple-300 font-bold">
                        @banking/observability
                      </span>
                      <span className="text-[10px] text-slate-400">
                        OpenTelemetry + Prom
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <span className="text-purple-300 font-bold">
                        @banking/kafka & @grpc
                      </span>
                      <span className="text-[10px] text-emerald-400">
                        Proto + Schema Registry
                      </span>
                    </div>
                  </div>
                )}

                {selectedDirectory === "infra" && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-white font-bold">
                          MongoDB 8.0
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400">
                        :27017 (ReplicaSet)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-white font-bold">Redis 8.0</span>
                      </div>
                      <span className="text-[10px] text-rose-300">
                        :6379 (Session Store)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Radio className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-white font-bold">
                          Apache Kafka
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-300">
                        :9092 (Event Mesh)
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-white font-bold">Zookeeper</span>
                      </div>
                      <span className="text-[10px] text-cyan-300">
                        :2181 (Coordination)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Monorepo Live Status Footer */}
              <div className="mt-3.5 pt-3 border-t border-[#1F2937] flex items-center justify-between text-[11px] font-code text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span>main • clean tree</span>
                </span>
                <span className="text-[#10B981] font-semibold">
                  Ready for Kubernetes & Helm
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          2. REAL-TIME SERVICE HEALTH & PORT CATALOG
      ───────────────────────────────────────────── */}
      <ServiceHealthCatalog />

      {/* ─────────────────────────────────────────────
          3. ARCHITECTURE & MONOREPO DEEP DIVE (Bento Grid)
      ───────────────────────────────────────────── */}
      <section
        id="architecture"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1F2937]"
      >
        {/* Section Header */}
        <div className="mb-10 text-left">
          <div className="inline-flex items-center space-x-2 text-xs font-code text-[#7C3AED] uppercase tracking-wider mb-2">
            <Workflow className="w-3.5 h-3.5" />
            <span>High-Scale Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Event-Driven Core, Zero-Trust Gateway & Monorepo Governance
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-1 max-w-2xl">
            Designed for financial mission-critical workloads: exact-once Kafka
            event semantics, zero circular dependencies, and millisecond API
            Gateway response times.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Event-Driven Core with Interactive Kafka Simulator (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-[#0B0F17]/90 border border-[#1F2937] p-6 sm:p-7 relative overflow-hidden backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#A78BFA]">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Event-Driven Core (Apache Kafka)
                    </h3>
                    <p className="text-xs text-[#9CA3AF]">
                      Standardized Kafka EventBus pub/sub mesh
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Partitions: 3
                </span>
              </div>

              {/* Topic Selector Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(KAFKA_EVENTS).map((topicKey) => (
                  <button
                    key={topicKey}
                    onClick={() => setActiveKafkaEvent(topicKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-code transition ${
                      activeKafkaEvent === topicKey
                        ? "bg-[#7C3AED] text-white font-bold shadow-md shadow-[#7C3AED]/30"
                        : "bg-[#111827] text-slate-400 hover:text-white border border-[#1F2937]"
                    }`}
                  >
                    {topicKey}
                  </button>
                ))}
              </div>

              {/* Event Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[11px] font-code">
                <div className="p-2 rounded bg-[#080B10] border border-[#1F2937]">
                  <p className="text-slate-500 text-[10px]">Topic</p>
                  <p className="text-purple-300 truncate">
                    {KAFKA_EVENTS[activeKafkaEvent].topic}
                  </p>
                </div>
                <div className="p-2 rounded bg-[#080B10] border border-[#1F2937]">
                  <p className="text-slate-500 text-[10px]">Partition</p>
                  <p className="text-[#10B981]">
                    p{KAFKA_EVENTS[activeKafkaEvent].partition}
                  </p>
                </div>
                <div className="p-2 rounded bg-[#080B10] border border-[#1F2937]">
                  <p className="text-slate-500 text-[10px]">Publisher</p>
                  <p className="text-slate-200 truncate">
                    {KAFKA_EVENTS[activeKafkaEvent].source}
                  </p>
                </div>
                <div className="p-2 rounded bg-[#080B10] border border-[#1F2937]">
                  <p className="text-slate-500 text-[10px]">Offset</p>
                  <p className="text-amber-400">
                    #{KAFKA_EVENTS[activeKafkaEvent].offset}
                  </p>
                </div>
              </div>

              {/* Payload Preview */}
              <div className="p-3.5 rounded-xl bg-[#080B10] border border-[#1F2937] font-code text-xs text-purple-200 overflow-x-auto terminal-scroll max-h-48">
                <pre>{KAFKA_EVENTS[activeKafkaEvent].payload}</pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-[11px] font-code text-slate-400">
              <span className="text-[#10B981]">
                Consumer: {KAFKA_EVENTS[activeKafkaEvent].consumer}
              </span>
              <span>Delivery: At-least-once</span>
            </div>
          </div>

          {/* Card 2: Zero-Trust Security & API Gateway (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#0B0F17]/90 border border-[#1F2937] p-6 sm:p-7 relative overflow-hidden backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Zero-Trust NestJS Gateway
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Reverse proxy with built-in rate-limiting
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-code text-xs">
                {/* Rule 1: Sliding Window Rate Limiting */}
                <div className="p-3 rounded-xl bg-[#080B10] border border-[#1F2937]">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#10B981] font-semibold">
                      Sliding-Window Limiter
                    </span>
                    <span className="text-slate-400">100 req/sec per IP</span>
                  </div>
                  <div className="w-full bg-[#111827] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#10B981] h-full w-2/5 rounded-full" />
                  </div>
                </div>

                {/* Rule 2: OpenTelemetry Tracing */}
                <div className="p-3 rounded-xl bg-[#080B10] border border-[#1F2937] space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>OpenTelemetry Trace ID:</span>
                    <span className="text-purple-300">8f2a991b-44c1</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Span Propagation:</span>
                    <span className="text-emerald-400">W3C TraceContext</span>
                  </div>
                </div>

                {/* Rule 3: Argon2 + JWT Refresh Cycle */}
                <div className="p-3 rounded-xl bg-[#080B10] border border-[#1F2937] space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Stateless JWT Duration:
                    </span>
                    <span className="text-white font-bold">15 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Rotating Refresh Token:
                    </span>
                    <span className="text-amber-400 font-bold">
                      7 days (Redis Revocable)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-[11px] font-code text-slate-400">
              <span className="flex items-center space-x-1 text-[#10B981]">
                <Lock className="w-3 h-3" />
                <span>mTLS gRPC Ready</span>
              </span>
              <span>Port :3000 Proxy</span>
            </div>
          </div>

          <GitOpsShowcase />

          {/* Card 3: Shared Core Packages & Monorepo Governance (Span 12 Full Width) */}
          <div className="lg:col-span-12 rounded-3xl bg-[#0B0F17]/90 border border-[#1F2937] p-6 sm:p-7 relative overflow-hidden backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#7C3AED]">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Shared Core Packages & Cluster Governance
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Internal TypeScript packages enforcing monorepo compliance
                    across all 11 microservices
                  </p>
                </div>
              </div>
              <span className="text-xs font-code px-3 py-1 rounded-full bg-[#111827] border border-[#1F2937] text-purple-300 self-start md:self-auto">
                Strict TS 5.8 • Zero Bundle Bloat
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-code text-xs">
              <div className="p-4 rounded-xl bg-[#080B10] border border-[#1F2937]">
                <span className="text-sm font-bold text-white block mb-1">
                  @banking/shared-types
                </span>
                <p className="text-[11px] text-slate-400 mb-2 font-sans">
                  Universal DTOs, Enums (AccountType, KycStatus,
                  TransactionStatus), and API response contracts.
                </p>
                <span className="text-[10px] text-[#10B981]">
                  ✔ 100% Contract Synced
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#080B10] border border-[#1F2937]">
                <span className="text-sm font-bold text-white block mb-1">
                  @banking/config
                </span>
                <p className="text-[11px] text-slate-400 mb-2 font-sans">
                  Environment parsing, Joi schema validation, port registries,
                  and JWT secret rotation helpers.
                </p>
                <span className="text-[10px] text-[#10B981]">
                  ✔ Fails Fast on Boot
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#080B10] border border-[#1F2937]">
                <span className="text-sm font-bold text-white block mb-1">
                  @banking/logger
                </span>
                <p className="text-[11px] text-slate-400 mb-2 font-sans">
                  Standardized JSON output, correlation IDs, sanitized PII
                  masking, and multi-stream transports.
                </p>
                <span className="text-[10px] text-[#10B981]">
                  ✔ PCI-DSS Sanitized
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#080B10] border border-[#1F2937]">
                <span className="text-sm font-bold text-white block mb-1">
                  @banking/observability
                </span>
                <p className="text-[11px] text-slate-400 mb-2 font-sans">
                  Prometheus metrics exporters, gRPC interceptors, and
                  Jaeger/OpenTelemetry distributed tracing.
                </p>
                <ObservabilityStatus />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          4. DYNAMIC INTERACTIVE WIDGET (The Quickstart)
      ───────────────────────────────────────────── */}
      <section
        id="quickstart"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1F2937]"
      >
        {/* Section Header */}
        <div className="mb-8 text-left">
          <div className="inline-flex items-center space-x-2 text-xs font-code text-[#10B981] uppercase tracking-wider mb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer Sandbox & Quickstart</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Local Setup to Multi-Node Mesh in 4 Steps
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-1 max-w-2xl">
            Clone, build, launch containers, and spin up all 13 services
            concurrently with one command.
          </p>
        </div>

        {/* Terminal Interactive Mockup Block */}
        <div className="rounded-3xl bg-[#0B0F17] border border-[#1F2937] shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* macOS / Linux Style Header with Tabs */}
          <div className="px-5 py-3.5 bg-[#080B10] border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
            {/* Window Controls */}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-xs font-code text-slate-400 ml-2">
                bash - zsh - 80x24
              </span>
            </div>

            {/* Quickstart Tabs */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#111827] border border-[#1F2937] overflow-x-auto">
              {QUICKSTART_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveQuickTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-code transition whitespace-nowrap ${
                    activeQuickTab === tab.id
                      ? "bg-[#7C3AED] text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Command Prompt & Annotation Banner */}
          <div className="p-5 sm:p-6 bg-[#0B0F17] border-b border-[#1F2937]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-code text-purple-400 font-semibold mb-1">
                {activeTabDetails.step} — {activeTabDetails.annotation}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-emerald-400 font-code font-bold">$</span>
                <span className="text-lg sm:text-xl font-code font-bold text-white">
                  {activeTabDetails.command}
                </span>
              </div>
            </div>

            <button
              onClick={() => copyText(activeTabDetails.command, true)}
              className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1F2937] border border-[#374151] text-xs font-code text-white transition flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
            >
              {copiedQuickstart ? (
                <>
                  <Check className="w-4 h-4 text-[#10B981]" />
                  <span className="text-[#10B981] font-bold">
                    Command Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-purple-400" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          {/* Simulated Terminal Output Stream */}
          <div className="p-6 bg-[#080B10] font-code text-xs space-y-2 min-h-[190px]">
            <div className="text-slate-500 text-[11px] pb-2 border-b border-[#1F2937]/50">
              # Execution snapshot (simulated local run on macOS / Windows /
              Linux)
            </div>
            {activeTabDetails.outputLines.map((line, idx) => (
              <div key={idx} className={line.color || "text-slate-300"}>
                {line.text}
              </div>
            ))}
          </div>

          {/* Bottom Interactive Sandbox Bar */}
          <div className="px-6 py-4 bg-[#0B0F17] border-t border-[#1F2937] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-code">
              Elapsed time:{" "}
              <span className="text-[#10B981] font-bold">
                {activeTabDetails.duration}
              </span>{" "}
              • Exit Code 0 (Success)
            </span>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Or Explore Preloaded Live Demo (Arjun Mehta)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          5. ENTERPRISE COMPLIANCE & ACCELERATION FOOTER
      ───────────────────────────────────────────── */}
      <footer
        id="compliance"
        className="relative z-10 border-t border-[#1F2937] bg-[#05070A] pt-16 pb-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top 3 Enterprise Safety Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#1F2937]">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Built-in SOC2 Auditing
              </h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Immutable event stream tracing, dual-authorization transfer
                policies, PII hashing, and tamper-resistant double-entry ledger
                journals.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#1F2937]">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                MongoDB 8 & Redis 8 Enterprise
              </h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Replica sets, atomic balances in minor currency units,
                sub-millisecond Redis session store, and multi-region read
                replicas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#1F2937]">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <Radio className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Kafka Distributed Ledger Immutability
              </h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Event-sourcing paradigm where financial state is computed
                deterministically from an append-only Kafka commit log.
              </p>
            </div>
          </div>

          {/* Centralized Email Capture Form: Enterprise Blueprint Guide */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#111827] to-[#0B0F17] border border-[#1F2937] text-center max-w-3xl mx-auto mb-16 shadow-2xl">
            <span className="text-[11px] font-code px-3 py-1 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-purple-300 uppercase tracking-wider font-semibold">
              Solutions Architecture Whitepaper
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-3 mb-2">
              Get the Enterprise Deployment Blueprint Guide
            </h3>
            <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-xl mx-auto mb-6">
              Includes complete Helm chart configurations, AWS EKS multi-AZ
              topology specs, Kafka partition sizing benchmarks, and PCI-DSS
              compliance checklists.
            </p>

            {emailSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-code max-w-md mx-auto animate-in fade-in duration-300 flex items-center justify-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  Blueprint sent! Check your corporate inbox for the PDF & Helm
                  repo link.
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleEmailSubmit}
                className="max-w-md mx-auto space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="cto@yourbank.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#080B10] border border-[#1F2937] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] font-code transition"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition shadow-lg shadow-[#7C3AED]/20 cursor-pointer"
                  >
                    Send Blueprint
                  </button>
                </div>
                {emailError && (
                  <p className="text-[11px] text-rose-400 text-left pl-1">
                    {emailError}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 text-center">
                  Zero spam. Instant technical PDF and Helm repository
                  credentials.
                </p>
              </form>
            )}
          </div>

          {/* Compliance Badges Bar */}
          <div className="py-6 border-t border-b border-[#1F2937]/70 flex flex-wrap items-center justify-center gap-6 text-[11px] font-code text-slate-400">
            <span className="flex items-center space-x-1.5 text-slate-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-[#10B981]" />
              <span>SOC2 Type II</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">
              PCI-DSS 4.0 Ready
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">
              ISO 27001 Certified Design
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">
              Basel III Capital Framework
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">
              GDPR Compliant PII Masking
            </span>
          </div>

          {/* Bottom Copyright & Navigation Links */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white">
                Nova<span className="text-[#10B981]">Bank</span> Engine
              </span>
              <span>• Distributed Cloud-Native Banking Microservices</span>
            </div>

            <div className="flex items-center space-x-6 text-xs">
              <Link href="/dashboard" className="hover:text-white transition">
                Live Dashboard
              </Link>
              <Link href="/login" className="hover:text-white transition">
                Sign In
              </Link>
              <Link href="/register" className="hover:text-white transition">
                Register Customer
              </Link>
              <a href="#services" className="hover:text-white transition">
                Port Catalog
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition flex items-center space-x-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
