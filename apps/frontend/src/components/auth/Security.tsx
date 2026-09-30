"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint, Monitor, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { setAccessToken } from "@/lib/api";
import {
  authError,
  authRequest,
  getMfaToken,
  safeNext,
  setMfaToken,
} from "@/lib/auth-client";
import { OtpInput, PasswordInput } from "./Fields";
import "./auth.css";

export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated)
      router.replace(
        `/auth/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
  }, [isLoading, isAuthenticated, router]);
  if (isLoading || !isAuthenticated)
    return <p role="status">Checking your session…</p>;
  if (
    requiredRole &&
    user?.role !== requiredRole &&
    !(user as unknown as { roles?: string[] }).roles?.includes(requiredRole)
  )
    return <p role="alert">Your account does not have access to this page.</p>;
  return <>{children}</>;
}

export function Mfa({ setup = false }: { setup?: boolean }) {
  const [method, setMethod] = useState("totp");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [backup, setBackup] = useState("");
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pending = useRef(false);
  const { refreshProfile } = useAuth();
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((n) => Math.max(0, n - 1));
      setResendCooldown((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  async function begin() {
    setBusy(true);
    setError("");
    try {
      const result = await authRequest<{ secret: string; qr: string }>(
        "mfa/setup",
        {},
      );
      setSecret(result.secret);
      if (
        result.qr?.startsWith("data:image/") ||
        result.qr?.startsWith("https://")
      )
        setQr(result.qr);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify(code: string) {
    if (pending.current || cooldown) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (setup) {
        await authRequest("mfa/enable", { code });
        const result = await authRequest<{ codes: string[] }>(
          "mfa/backup-codes",
        );
        setCodes(result.codes);
        setNotice("Two-step verification is enabled.");
      } else {
        if (!getMfaToken())
          throw new Error(
            "Your sign-in challenge expired. Please sign in again.",
          );
        const result = await authRequest<{
          accessToken?: string;
          tokens?: { accessToken?: string };
        }>("login/mfa", {
          mfaToken: getMfaToken(),
          code,
          method,
          trustDevice: trust,
        });
        const token = result.accessToken || result.tokens?.accessToken;
        if (!token) throw new Error("The server did not return a session.");
        setAccessToken(token);
        setMfaToken(null);
        await refreshProfile();
        router.replace(safeNext());
      }
    } catch (e) {
      setError(authError(e));
      if ((e as { status?: number }).status === 429) setCooldown(900);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch {
      setError(
        "Clipboard access is unavailable. Select and copy the text manually.",
      );
    }
  }
  return (
    <>
      <div className="auth-icon">
        <Fingerprint />
      </div>
      <h2>{setup ? "An extra layer of you." : "One more security check."}</h2>
      <p className="auth-subtitle">
        {setup
          ? "Keep your account protected with an authenticator app."
          : "Verify it’s you to securely finish signing in."}
      </p>
      {error && (
        <p className="auth-notice auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="auth-notice" role="status">
          {notice}
        </p>
      )}
      {cooldown > 0 && (
        <p role="status" className="auth-small">
          Try again in {Math.floor(cooldown / 60)}:
          {String(cooldown % 60).padStart(2, "0")}
        </p>
      )}
      {setup && !secret && (
        <button className="auth-button" disabled={busy} onClick={begin}>
          {busy ? "Preparing…" : "Set up authenticator"}
        </button>
      )}
      {codes.length > 0 ? (
        <>
          <h3>Save your backup codes</h3>
          <p className="auth-small">
            Save these somewhere safe. You won’t see them again. Each code can
            be used once.
          </p>
          <div className="auth-codes">
            {codes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className="auth-form" style={{ marginTop: 18 }}>
            <button
              className="auth-button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([codes.join("\n")], { type: "text/plain" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "novabank-backup-codes.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download backup codes
            </button>
            <button
              className="auth-button secondary"
              onClick={() => void copy(codes.join("\n"))}
            >
              Copy all codes
            </button>
            <Link href="/dashboard">Return to dashboard</Link>
          </div>
        </>
      ) : (
        <>
          {setup && secret && (
            <div className="auth-form">
              {qr && (
                <img
                  src={qr}
                  alt="Scan this QR code in your authenticator app"
                  width={200}
                  height={200}
                />
              )}
              <p className="auth-small">
                Can’t scan? Enter this key manually:
              </p>
              <code style={{ overflowWrap: "anywhere" }}>{secret}</code>
              <button
                className="auth-button secondary"
                onClick={() => void copy(secret)}
              >
                Copy setup key
              </button>
              <OtpInput
                disabled={busy || cooldown > 0}
                onComplete={(code) => void verify(code)}
              />
            </div>
          )}
          {!setup && (
            <>
              <div
                className="auth-tabs"
                role="tablist"
                aria-label="Verification method"
              >
                {[
                  ["totp", "Authenticator"],
                  ["sms", "SMS"],
                  ["backup", "Backup code"],
                ].map(([id, label]) => (
                  <button
                    role="tab"
                    aria-selected={method === id}
                    key={id}
                    disabled={busy}
                    onClick={() => setMethod(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {method === "backup" ? (
                <form
                  className="auth-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void verify(backup);
                  }}
                >
                  <label className="auth-field">
                    Backup code
                    <input
                      value={backup}
                      onChange={(e) => setBackup(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <button
                    className="auth-button"
                    disabled={busy || cooldown > 0}
                  >
                    Verify backup code
                  </button>
                </form>
              ) : (
                <OtpInput
                  key={method}
                  disabled={busy || cooldown > 0}
                  onComplete={(code) => void verify(code)}
                />
              )}
              {method === "sms" && (
                <button
                  className="auth-button secondary"
                  style={{ marginTop: 16 }}
                  disabled={busy || cooldown > 0 || resendCooldown > 0}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await authRequest("resend-otp", {
                        channel: "sms",
                        mfaToken: getMfaToken(),
                      });
                      setResendCooldown(60);
                      setNotice("A new code is on its way.");
                    } catch (e) {
                      setError(authError(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {resendCooldown
                    ? "Resend in " + resendCooldown + "s"
                    : "Send SMS code"}
                </button>
              )}
              <label className="auth-check" style={{ marginTop: 20 }}>
                <input
                  type="checkbox"
                  checked={trust}
                  onChange={(e) => setTrust(e.target.checked)}
                />
                Trust this device for 30 days
              </label>
              <p className="auth-small" style={{ marginTop: 25 }}>
                <Link href="/auth/login">Back to sign in</Link>
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}

type Session = {
  id: string;
  device?: string;
  userAgent?: string;
  location?: string;
  ip?: string;
  lastActiveAt?: string;
  current?: boolean;
  isCurrent?: boolean;
};
export function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  async function reload() {
    setBusy(true);
    setError("");
    try {
      const result = await authRequest<{ sessions: Session[] } | Session[]>(
        "sessions",
      );
      setSessions(Array.isArray(result) ? result : result.sessions);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function revoke(id?: string) {
    setBusy(true);
    setError("");
    try {
      await authRequest(
        id ? `sessions/${encodeURIComponent(id)}` : "sessions",
        undefined,
        "DELETE",
      );
      setSessions((prev) =>
        prev.filter((s) => (id ? s.id !== id : s.current || s.isCurrent)),
      );
      dialog.current?.close();
      await reload();
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="auth-icon">
        <ShieldCheck />
      </div>
      <h2>Your devices. Your control.</h2>
      <p className="auth-subtitle">
        Review where you’re signed in and remove any device you don’t
        recognize.
      </p>
      {error && (
        <p className="auth-notice auth-error" role="alert">
          {error}
          <button onClick={reload} disabled={busy} style={{ marginLeft: 10 }}>
            Retry
          </button>
        </p>
      )}
      {busy && <p role="status">Loading sessions…</p>}
      {!busy && !error && !sessions.length && (
        <p className="auth-notice">No active sessions returned.</p>
      )}
      {sessions.map((session) => (
        <article className="auth-session" key={session.id}>
          <Monitor size={22} />
          <div>
            <strong>
              {session.device || friendlyDevice(session.userAgent || "")}
            </strong>
            <p className="auth-small">
              {session.location || "Location unavailable"} ·{" "}
              {session.ip || "IP unavailable"}
            </p>
            <p className="auth-small">
              {session.current || session.isCurrent
                ? "This device · active now"
                : session.lastActiveAt
                  ? new Date(session.lastActiveAt).toLocaleString()
                  : "Last activity unavailable"}
            </p>
          </div>
          {!session.current && !session.isCurrent && (
            <button disabled={busy} onClick={() => void revoke(session.id)}>
              Revoke
            </button>
          )}
        </article>
      ))}
      <button
        className="auth-button secondary"
        disabled={busy || !sessions.some((s) => !s.current && !s.isCurrent)}
        onClick={() => dialog.current?.showModal()}
      >
        Sign out all other sessions
      </button>
      <p className="auth-small" style={{ marginTop: 20 }}>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <dialog ref={dialog} className="auth-modal">
        <h2 style={{ fontSize: 24 }}>Sign out other devices?</h2>
        <p className="auth-subtitle">
          All other devices will need to sign in again. This device will stay
          signed in.
        </p>
        <div className="auth-form">
          <button
            className="auth-button"
            disabled={busy}
            onClick={() => void revoke()}
          >
            Sign out other devices
          </button>
          <button
            autoFocus
            className="auth-button secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
function friendlyDevice(ua: string) {
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac/.test(ua)
          ? "Mac"
          : "Device";
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
      ? "Chrome"
      : /Firefox/.test(ua)
        ? "Firefox"
        : /Safari/.test(ua)
          ? "Safari"
          : "Browser";
  return `${os} · ${browser}`;
}

export function LockForm({ onUnlock }: { onUnlock?: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <>
      <div className="auth-icon">
        <Fingerprint />
      </div>
      <h2>Session locked.</h2>
      <p className="auth-subtitle">
        A moment away? Enter your password to pick up where you left off.
      </p>
      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await authRequest<{ elevatedToken?: string }>(
              "reauth",
              { password },
            );
            if (!result.elevatedToken)
              throw new Error("The server did not confirm re-authentication.");
            setPassword("");
            onUnlock ? onUnlock() : router.replace("/dashboard");
          } catch (err) {
            setError(authError(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <PasswordInput value={password} onChange={setPassword} />
        {error && (
          <p className="auth-notice auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="auth-button" disabled={busy || !password}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
        <button
          type="button"
          className="auth-button secondary"
          disabled={busy}
          onClick={async () => {
            await logout();
            router.replace("/auth/login");
          }}
        >
          Sign out
        </button>
      </form>
    </>
  );
}

export function SessionLockOverlay() {
  const { isAuthenticated, isDemoMode } = useAuth();
  const [locked, setLocked] = useState(false);
  const lastActivity = useRef(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isAuthenticated || isDemoMode) {
      setLocked(false);
      return;
    }
    lastActivity.current = Date.now();
    const activity = () => {
      if (!locked) lastActivity.current = Date.now();
    };
    const check = () => {
      if (Date.now() - lastActivity.current >= 600000) setLocked(true);
    };
    const sensitive = () => setLocked(true);
    const timer = setInterval(check, 10000);
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach((event) =>
      window.addEventListener(event, activity, { passive: true }),
    );
    window.addEventListener("auth:lock", sensitive);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, activity));
      window.removeEventListener("auth:lock", sensitive);
    };
  }, [isAuthenticated, isDemoMode, locked]);
  useEffect(() => {
    if (locked) dialog.current?.showModal();
    else dialog.current?.close();
  }, [locked]);
  return (
    <dialog
      ref={dialog}
      className="auth-modal"
      aria-label="Session locked"
      onCancel={(e) => e.preventDefault()}
    >
      <LockForm
        onUnlock={() => {
          lastActivity.current = Date.now();
          setLocked(false);
        }}
      />
    </dialog>
  );
}
