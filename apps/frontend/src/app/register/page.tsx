"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Zap,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [optInEmails, setOptInEmails] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password requirement checks
  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.length) score += 20;
    if (passwordChecks.uppercase) score += 20;
    if (passwordChecks.lowercase) score += 20;
    if (passwordChecks.number) score += 20;
    if (passwordChecks.special) score += 20;
    return score;
  }, [passwordChecks]);

  const passwordStrengthLabel = useMemo(() => {
    if (passwordScore <= 20) return { text: "Very Weak", color: "bg-rose-500" };
    if (passwordScore <= 40) return { text: "Weak", color: "bg-orange-500" };
    if (passwordScore <= 60) return { text: "Fair", color: "bg-yellow-500" };
    if (passwordScore <= 80) return { text: "Strong", color: "bg-emerald-400" };
    return { text: "Very Strong", color: "bg-cyan-400" };
  }, [passwordScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError("You must agree to the Terms of Service to continue.");
      return;
    }

    if (passwordScore < 80) {
      setError(
        "Please ensure your password meets all complexity requirements.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });

      setSuccess(true);

      // Automatically sign in and go to dashboard after a short notification
      setTimeout(async () => {
        try {
          await login({ email: email.trim(), password });
          router.push("/dashboard");
        } catch {
          router.push("/login");
        }
      }, 1500);
    } catch (err: any) {
      setError(
        err.message || "Registration failed. Please check your details.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic ambient glowing backgrounds */}
      <div className="fixed top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -right-20 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition duration-200" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Nova
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                Bank
              </span>
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white pt-2">
            Open your secure digital account
          </h1>
          <p className="text-xs text-slate-400">
            Instant setup • Zero hidden fees • Enterprise-grade security
          </p>
        </div>

        {/* Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-3 text-emerald-400 text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Account created successfully!</p>
                <p className="text-slate-400">
                  Publishing user.registered event & logging you in...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-400 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="register-firstname"
                    type="text"
                    required
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Last Name
                </label>
                <input
                  id="register-lastname"
                  type="text"
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="pt-2 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Strength:</span>
                    <span className="font-semibold text-white">
                      {passwordStrengthLabel.text}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrengthLabel.color} transition-all duration-300`}
                      style={{ width: `${passwordScore}%` }}
                    />
                  </div>

                  {/* Checklist requirements */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div
                      className={`flex items-center space-x-1.5 ${passwordChecks.length ? "text-emerald-400" : "text-slate-500"}`}
                    >
                      {passwordChecks.length ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>8+ Characters</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${passwordChecks.uppercase ? "text-emerald-400" : "text-slate-500"}`}
                    >
                      {passwordChecks.uppercase ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Uppercase Letter</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${passwordChecks.number ? "text-emerald-400" : "text-slate-500"}`}
                    >
                      {passwordChecks.number ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Number</span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 ${passwordChecks.special ? "text-emerald-400" : "text-slate-500"}`}
                    >
                      {passwordChecks.special ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Special Symbol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5 pt-2">
              <label className="flex items-start space-x-2 text-xs text-slate-400 cursor-pointer">
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I agree to NovaBank&apos;s{" "}
                  <span className="text-indigo-400 underline">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="text-indigo-400 underline">
                    Privacy Policy
                  </span>
                  .
                </span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optInEmails}
                  onChange={(e) => setOptInEmails(e.target.checked)}
                  className="rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Send me occasional product updates & security alerts
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isSubmitting || success}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition duration-150" />
                </>
              )}
            </button>
          </form>

          {/* Footer separator */}
          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Automated Kafka Event Pipeline • Instant Customer Profile
            Scaffolding
          </span>
        </div>
      </div>
    </main>
  );
}
