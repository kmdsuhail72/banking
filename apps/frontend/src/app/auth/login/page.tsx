"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PasswordInput } from "@/components/auth/Fields";
import {
  authError,
  authRequest,
  safeNext,
  setMfaToken,
} from "@/lib/auth-client";
import { setAccessToken } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const { refreshProfile, enterDemoMode } = useAuth();
  const router = useRouter();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await authRequest<{
        accessToken?: string;
        tokens?: { accessToken?: string };
        mfaRequired?: boolean;
        mfaToken?: string;
      }>("login", { email, password, rememberMe: remember });
      if (result.mfaRequired && result.mfaToken) {
        setMfaToken(result.mfaToken);
        router.push(
          `/auth/mfa/challenge?next=${encodeURIComponent(safeNext())}`,
        );
        return;
      }
      const token = result.accessToken || result.tokens?.accessToken;
      if (!token)
        throw new Error(
          "The server did not return a session. Please try again.",
        );
      setAccessToken(token);
      await refreshProfile();
      router.replace(safeNext());
    } catch (err) {
      setError(
        (err as { status?: number }).status === 401
          ? "Email or password is incorrect."
          : authError(err),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="auth-icon">
        <LockKeyhole size={23} />
      </div>
      <h2>Welcome back.</h2>
      <p className="auth-subtitle">
        Your next move starts here.
        <br />
        Sign in to your NovaBank account.
      </p>
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field" htmlFor="auth-email">
          Email address
          <input
            id="auth-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="you@example.com"
            required
            aria-invalid={touched && !valid}
            aria-describedby={touched && !valid ? "email-error" : undefined}
          />
        </label>
        {touched && !valid && (
          <span id="email-error" className="auth-small">
            Enter a valid email address.
          </span>
        )}
        <PasswordInput value={password} onChange={setPassword} />
        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link className="auth-small" href="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>
        {error && (
          <p className="auth-notice auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="auth-button" disabled={busy || !valid || !password}>
          {busy ? "Signing in…" : "Sign in"}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="auth-divider">A first look, without the commitment</div>
      <button
        className="auth-button secondary"
        onClick={() => {
          enterDemoMode();
          router.push("/dashboard");
        }}
      >
        Explore the demo <ArrowRight size={15} />
      </button>
      <p className="auth-small auth-center" style={{ marginTop: 28 }}>
        New to NovaBank?{" "}
        <Link href="/auth/register">
          <strong>Create an account</strong>
        </Link>
      </p>
    </>
  );
}
