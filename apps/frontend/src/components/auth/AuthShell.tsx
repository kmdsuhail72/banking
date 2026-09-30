"use client";

import Link from "next/link";
import { ArrowUpRight, Fingerprint, ShieldCheck, Zap } from "lucide-react";
import "./auth.css";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <aside className="auth-brand">
        <Link href="/" className="auth-logo">
          <Zap size={24} /> NovaBank<span>PERSONAL BANKING</span>
        </Link>
        <div className="auth-brand-story">
          <span className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>
            More possibility.
            <br />
            Less complexity.
          </h1>
          <p>
            A little more freedom. A lot more peace of mind.
            <br />
            Banking built around you.
          </p>
          <div className="auth-art" aria-hidden="true">
            <div className="auth-orbit" />
            <div className="auth-orbit second" />
            <div className="auth-bank-card">
              <div>
                NovaBank <Zap size={22} />
              </div>
              <span className="auth-chip">▦</span>
              <p>•••• &nbsp; •••• &nbsp; •••• &nbsp; 2048</p>
              <footer>
                MADE FOR YOUR EVERYDAY <ArrowUpRight size={22} />
              </footer>
            </div>
            <div className="auth-secure-pill">
              <ShieldCheck size={20} />
              <span>
                Your security.
                <br />
                <strong>Always a priority.</strong>
              </span>
            </div>
          </div>
        </div>
        <div className="auth-brand-bottom">
          <Fingerprint size={30} />
          <p>
            Your money is personal.
            <br />
            <strong>Keeping it secure is our purpose.</strong>
          </p>
        </div>
      </aside>
      <section className="auth-main">
        <header>
          <span>
            <ShieldCheck size={15} /> Secure account access
          </span>
          <Link href="/auth/login">
            Sign in <ArrowUpRight size={14} />
          </Link>
        </header>
        <div className="auth-content">{children}</div>
        <footer>
          <span>© {new Date().getFullYear()} NovaBank</span>
          <span>Built for your peace of mind</span>
        </footer>
      </section>
    </main>
  );
}
