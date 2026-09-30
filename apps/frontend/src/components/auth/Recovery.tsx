"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { authError, authRequest } from "@/lib/auth-client";
import { PasswordInput, passwordChecks, OtpInput } from "./Fields";

export function Recovery({
  mode,
}: {
  mode: "forgot-password" | "reset-password" | "verify-email" | "verify-phone";
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [token, setToken] = useState("");
  const verifying = useRef(false);
  const pending = useRef(false);
  useEffect(() => {
    const timer = setInterval(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const value =
      new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
    if (mode === "verify-email" && value && !verifying.current) {
      verifying.current = true;
      setBusy(true);
      authRequest("verify-email", { token: value })
        .then(() =>
          setSuccess("Your email is verified. You’re ready to sign in."),
        )
        .catch((e) => setError(authError(e)))
        .finally(() => setBusy(false));
    }
    if (mode === "reset-password" && !value)
      setError(
        "This reset link is missing its token. Request a new link to continue.",
      );
  }, [mode]);
  async function run(body: unknown, endpoint = mode) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await authRequest(endpoint, body);
      setSuccess(
        mode === "forgot-password"
          ? "If an account exists, we’ve sent a reset link."
          : mode === "reset-password"
            ? "Password updated. Sign in with your new password."
            : "Your phone number is verified.",
      );
      if (mode === "forgot-password") setCooldown(60);
    } catch (e) {
      setError(authError(e));
      if ((e as { status?: number }).status === 429) setCooldown(60);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function resend(channel: string) {
    setBusy(true);
    setError("");
    try {
      await authRequest("resend-otp", {
        channel,
        target: channel === "email" ? email : phone,
      });
      setCooldown(60);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    "forgot-password": "Forgot your password?",
    "reset-password": "A fresh start.",
    "verify-email": "Check your inbox.",
    "verify-phone": "Verify your number.",
  };
  return (
    <>
      <div className="auth-icon">
        {mode.includes("verify") ? <ShieldCheck /> : <Mail />}
      </div>
      <h2>{titles[mode]}</h2>
      <p className="auth-subtitle">
        {mode === "forgot-password"
          ? "It happens. Enter your email and we’ll send you a reset link."
          : mode === "reset-password"
            ? "Choose a strong password you haven’t used before."
            : mode === "verify-email"
              ? "Follow the verification link in your email to finish setting up your account."
              : "Enter the six-digit code sent to your phone."}
      </p>
      {busy && (
        <p role="status" className="auth-small">
          Please wait…
        </p>
      )}
      {error && (
        <p role="alert" className="auth-notice auth-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="auth-notice">
          {success}
        </p>
      )}
      {(!success || mode === "forgot-password") && (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "forgot-password") void run({ email });
            if (mode === "reset-password") {
              if (password !== confirm) {
                setError("Passwords do not match.");
                return;
              }
              void run({ token, newPassword: password });
            }
            if (mode === "verify-email") void resend("email");
            if (mode === "verify-phone") void resend("sms");
          }}
        >
          {(mode === "forgot-password" ||
            (mode === "verify-email" && !busy)) && (
            <label className="auth-field">
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {mode === "reset-password" && (
            <>
              <PasswordInput
                value={password}
                onChange={setPassword}
                newPassword
                meter
                label="New password"
              />
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                newPassword
                label="Confirm new password"
              />
              <p className="auth-small">
                You cannot reuse your last three passwords.
              </p>
            </>
          )}
          {mode === "verify-phone" && (
            <>
              <label className="auth-field">
                Phone number
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <OtpInput
                disabled={busy || !phone}
                onComplete={(code) => void run({ phone, code })}
              />
            </>
          )}
          <button
            className="auth-button"
            disabled={
              busy ||
              cooldown > 0 ||
              (mode === "reset-password" &&
                (!token ||
                  !passwordChecks(password).every(Boolean) ||
                  password !== confirm))
            }
          >
            {cooldown
              ? `Try again in ${cooldown}s`
              : mode === "forgot-password"
                ? "Send reset link"
                : mode === "reset-password"
                  ? "Update password"
                  : "Resend verification"}
          </button>
        </form>
      )}
      <p className="auth-small auth-center" style={{ marginTop: 25 }}>
        <Link
          href={
            mode === "reset-password" && error
              ? "/auth/forgot-password"
              : "/auth/login"
          }
        >
          {mode === "reset-password" && error
            ? "Request a new reset link"
            : "Back to sign in"}
        </Link>
      </p>
    </>
  );
}
