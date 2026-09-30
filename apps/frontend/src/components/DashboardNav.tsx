"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function DashboardNav() {
  const pathname = usePathname();
  const { user, customer, logout, isDemoMode } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved =
      (localStorage.getItem("novabank_theme") as "dark" | "light") || "dark";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (t: "dark" | "light") => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (t === "light") {
        root.classList.remove("dark");
        root.classList.add("light");
        root.setAttribute("data-theme", "light");
      } else {
        root.classList.remove("light");
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      }
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("novabank_theme", next);
    applyTheme(next);
  };

  const navItems = [
    { label: "Overview", href: "/dashboard" },
    { label: "Accounts", href: "/dashboard/accounts" },
    { label: "Transfer", href: "/dashboard/transfer" },
    { label: "Deposit", href: "/dashboard/deposit" },
    { label: "Withdraw", href: "/dashboard/withdraw" },
    { label: "Transactions", href: "/dashboard/transactions" },
    { label: "Profile", href: "/profile" },
    { label: "Security", href: "/auth/sessions" },
  ];

  const displayName = customer?.firstName
    ? `${customer.firstName} ${customer.lastName || ""}`
    : user?.email?.split("@")[0] || "Customer";

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-black text-lg tracking-tight">
                  N
                </span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Nova<span className="text-emerald-400">Bank</span>
              </span>
            </Link>

            {isDemoMode && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Demo Mode</span>
              </div>
            )}

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 ml-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Controls, Theme Toggle & Profile */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "bright/light" : "dark"} mode`}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-sm flex items-center justify-center cursor-pointer"
            >
              {theme === "dark" ? (
                <span className="flex items-center space-x-1 text-amber-400 text-xs font-semibold">
                  <span>☀️</span>
                  <span className="hidden lg:inline text-[11px] text-slate-300">
                    Bright
                  </span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-cyan-400 text-xs font-semibold">
                  <span>🌙</span>
                  <span className="hidden lg:inline text-[11px] text-slate-300">
                    Dark
                  </span>
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">{displayName}</p>
                <p className="text-slate-400 truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-2 border-t border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
