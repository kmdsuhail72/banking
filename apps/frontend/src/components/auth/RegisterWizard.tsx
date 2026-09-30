"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserRound, UploadCloud } from "lucide-react";
import { authError, authRequest } from "@/lib/auth-client";
import { PasswordInput, passwordChecks } from "./Fields";

const steps = [
  "Personal details",
  "Contact information",
  "Identity verification",
  "Account security",
  "Review & confirm",
];
const blank = {
  firstName: "",
  lastName: "",
  dob: "",
  nationality: "",
  email: "",
  phone: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  postal: "",
  country: "",
  documentType: "Passport",
  mfa: "none",
};
type Profile = typeof blank;
const draftKey = "novabank-registration-draft-v1";
export function RegisterWizard() {
  const [profile, setProfile] = useState<Profile>(blank);
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [draft, setDraft] = useState<Profile | null>(null);
  const [save, setSave] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDraft(
          Object.fromEntries(
            Object.keys(blank).map((k) => [
              k,
              typeof parsed[k] === "string"
                ? parsed[k]
                : blank[k as keyof Profile],
            ]),
          ) as Profile,
        );
      }
    } catch {
      /* Storage can be unavailable. */
    }
  }, []);
  useEffect(() => {
    if (save && !success) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(profile));
      } catch {
        /* Continue without persistence. */
      }
    }
  }, [profile, save, success]);
  useEffect(() => {
    if (success) {
      const timer = setTimeout(
        () => window.location.assign("/auth/verify-email"),
        3000,
      );
      return () => clearTimeout(timer);
    }
  }, [success]);
  function field(
    key: keyof Profile,
    label: string,
    type = "text",
    required = true,
  ) {
    return (
      <label className="auth-field">
        {label}
        <input
          type={type}
          required={required}
          value={profile[key]}
          onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
        />
      </label>
    );
  }
  function addFile(slot: string, file?: File) {
    if (!file) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    ) {
      setError("Choose a JPG, PNG, or PDF smaller than 5 MB.");
      return;
    }
    setError("");
    setFiles((prev) => ({ ...prev, [slot]: file }));
  }
  async function next(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0) {
      const birth = new Date(profile.dob + "T00:00:00");
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      if (!Number.isFinite(birth.getTime()) || birth > cutoff) {
        setError("You must be at least 18 years old to open an account.");
        return;
      }
      if (
        ![profile.firstName, profile.lastName].every((n) =>
          /^[\p{L}\p{M}][\p{L}\p{M} '\-]*$/u.test(n.trim()),
        )
      ) {
        setError("Enter a valid first and last name.");
        return;
      }
    }
    if (
      step === 2 &&
      (!files.front ||
        (!files.back && profile.documentType !== "Passport") ||
        !consent)
    ) {
      setError(
        "Upload the required document sides and provide consent to continue.",
      );
      return;
    }
    if (
      step === 3 &&
      (!passwordChecks(password).every(Boolean) || password !== confirm)
    ) {
      setError(
        "Meet the password requirements and make sure both passwords match.",
      );
      return;
    }
    if (step < 4) {
      setStep(step + 1);
      heading.current?.focus();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      // A document upload must succeed before any account is created. Never discard KYC data.
      const documents: Record<string, string> = {};
      for (const [slot, file] of Object.entries(files)) {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(
              new Error(
                "Could not read your document. Please select it again.",
              ),
            );
          reader.readAsDataURL(file);
        });
        const uploaded = await authRequest<{ id: string }>("kyc/documents", {
          filename: file.name,
          content,
          slot,
        });
        if (!uploaded.id)
          throw new Error(
            "The document service did not return an upload reference.",
          );
        documents[slot] = uploaded.id;
      }
      await authRequest("register", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        password,
        profile,
        kyc: { documentType: profile.documentType, documents, consent },
        preferences: { mfa: profile.mfa, marketing },
        termsAccepted: terms,
      });
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* No storage. */
      }
      setPassword("");
      setConfirm("");
      setFiles({});
      setSuccess(true);
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <>
        <h2>Account created!</h2>
        <p className="auth-notice" role="status">
          We’ve sent a verification link to {profile.email}.
        </p>
        <Link className="auth-button" href="/auth/verify-email">
          Continue to email verification
        </Link>
      </>
    );
  return (
    <>
      <div className="auth-icon">
        <UserRound />
      </div>
      <h2 ref={heading} tabIndex={-1}>
        A better everyday starts here.
      </h2>
      <p className="auth-subtitle">
        A few details. A secure account. A world of possibility.
      </p>
      {draft && (
        <div className="auth-notice">
          <p>
            Resume where you left off? Passwords and documents must be entered
            again.
          </p>
          <div className="auth-row">
            <button
              type="button"
              onClick={() => {
                setProfile(draft);
                setDraft(null);
                setSave(true);
              }}
            >
              Resume draft
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                localStorage.removeItem(draftKey);
              }}
            >
              Start fresh
            </button>
          </div>
        </div>
      )}
      <div className="auth-row auth-small">
        <strong>Step {step + 1} of 5</strong>
        <span>{steps[step]}</span>
      </div>
      <div
        className="auth-steps"
        aria-label={`Step ${step + 1} of 5: ${steps[step]}`}
      >
        {steps.map((s, i) => (
          <span key={s} className={i <= step ? "active" : ""} />
        ))}
      </div>
      <form className="auth-form" onSubmit={next}>
        {step === 0 && (
          <>
            <div className="auth-grid">
              {field("firstName", "First name")}
              {field("lastName", "Last name")}
            </div>
            {field("dob", "Date of birth", "date")}
            {field("nationality", "Nationality")}
            <label className="auth-check">
              <input
                type="checkbox"
                checked={save}
                onChange={(e) => {
                  setSave(e.target.checked);
                  if (!e.target.checked) localStorage.removeItem(draftKey);
                }}
              />
              Save my details on this device so I can finish later. Use only on
              a private device.
            </label>
          </>
        )}
        {step === 1 && (
          <>
            {field("email", "Email address", "email")}
            {field("phone", "Phone number with country code", "tel")}
            {field("address", "Address line 1")}
            {field("address2", "Address line 2 (optional)", "text", false)}
            <div className="auth-grid">
              {field("city", "City")}
              {field("state", "State")}
              {field("postal", "Postal code")}
              {field("country", "Country")}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <label className="auth-field">
              Document type
              <select
                value={profile.documentType}
                onChange={(e) =>
                  setProfile({ ...profile, documentType: e.target.value })
                }
              >
                {["Passport", "National ID", "Driver’s license"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {[
              "front",
              ...(profile.documentType === "Passport" ? [] : ["back"]),
              "selfie",
            ].map((slot) => (
              <div
                key={slot}
                className="auth-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFile(slot, e.dataTransfer.files[0]);
                }}
              >
                <UploadCloud size={23} style={{ margin: "auto" }} />
                <label>
                  {slot === "selfie" ? "Selfie (optional)" : `Document ${slot}`}
                  <input
                    aria-label={`Upload ${slot}`}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => addFile(slot, e.target.files?.[0])}
                  />
                </label>
                <span className="auth-small">
                  Drop a JPG, PNG or PDF here · up to 5 MB
                </span>
                {files[slot] && (
                  <div className="auth-file">
                    <span>{files[slot].name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${slot}`}
                      onClick={() =>
                        setFiles((prev) => {
                          const next = { ...prev };
                          delete next[slot];
                          return next;
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
            <label className="auth-check">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I consent to processing my identity documents for verification.
            </label>
          </>
        )}
        {step === 3 && (
          <>
            <PasswordInput
              value={password}
              onChange={setPassword}
              newPassword
              meter
            />
            <PasswordInput
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              newPassword
            />
            <label className="auth-field">
              Two-step verification preference
              <select
                value={profile.mfa}
                onChange={(e) =>
                  setProfile({ ...profile, mfa: e.target.value })
                }
              >
                <option value="none">Set up later</option>
                <option value="sms">SMS</option>
                <option value="totp">Authenticator app (recommended)</option>
              </select>
            </label>
            <p className="auth-small">
              You’ll verify and enable your selected method after creating your
              account.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <dl className="auth-summary">
              {[
                [
                  "Personal details",
                  `${profile.firstName} ${profile.lastName} · ${profile.dob} · ${profile.nationality}`,
                ],
                [
                  "Contact information",
                  `${profile.email} · ${profile.phone} · ${profile.address}, ${profile.address2}, ${profile.city}, ${profile.state}, ${profile.postal}, ${profile.country}`,
                ],
                [
                  "Identity verification",
                  `${profile.documentType} · ${Object.values(files)
                    .map((f) => f.name)
                    .join(", ")}`,
                ],
                ["Security", `Password set · MFA preference: ${profile.mfa}`],
              ].map(([title, value], i) => (
                <div key={title}>
                  <dt className="auth-row">
                    {title}
                    <button type="button" onClick={() => setStep(i)}>
                      Edit
                    </button>
                  </dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <label className="auth-check">
              <input
                type="checkbox"
                required
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              I accept the account terms and privacy policy provided by
              NovaBank.
            </label>
            <label className="auth-check">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              Send me product news and offers (optional).
            </label>
          </>
        )}
        {error && (
          <p className="auth-notice auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-row">
          {step > 0 && (
            <button
              className="auth-button secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              Back
            </button>
          )}
          <button className="auth-button" disabled={busy}>
            {busy
              ? "Creating account…"
              : step === 4
                ? "Create account"
                : "Continue →"}
          </button>
        </div>
      </form>
      <p className="auth-small auth-center" style={{ marginTop: 24 }}>
        Already have an account? <Link href="/auth/login">Sign in</Link>
      </p>
    </>
  );
}
