"use client";
import { useId, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const passwordChecks = (value: string) => [
  value.length >= 8,
  /[A-Z]/.test(value),
  /\d/.test(value),
  /[^A-Za-z0-9]/.test(value),
];
export function PasswordInput({
  value,
  onChange,
  label = "Password",
  newPassword = false,
  meter = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  newPassword?: boolean;
  meter?: boolean;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const checks = passwordChecks(value);
  const score = checks.filter(Boolean).length;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input
          id={id}
          required
          value={value}
          type={show ? "text" : "password"}
          autoComplete={newPassword ? "new-password" : "current-password"}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
          onBlur={() => setCaps(false)}
          aria-describedby={caps ? `${id}-caps` : undefined}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {caps && (
        <span id={`${id}-caps`} className="auth-small" role="status">
          Caps Lock is on.
        </span>
      )}
      {meter && (
        <>
          <div className="auth-strength">
            {checks.map((_, i) => (
              <span
                key={i}
                style={{
                  background:
                    i < score
                      ? ["#f43f5e", "#f59e0b", "#10b981", "#4f46e5"][
                          Math.max(0, score - 1)
                        ]
                      : undefined,
                }}
              />
            ))}
          </div>
          <span className="auth-small">
            Requirements met: {score}/4 ·{" "}
            {["8+ characters", "uppercase letter", "number", "symbol"]
              .map((t, i) => `${checks[i] ? "✓" : "○"} ${t}`)
              .join(" · ")}
          </span>
        </>
      )}
    </div>
  );
}

export function OtpInput({
  onComplete,
  disabled = false,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
}) {
  const [values, setValues] = useState(Array<string>(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  function update(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6 - index);
    const next = [...values];
    if (!digits) next[index] = "";
    else
      digits.split("").forEach((d, n) => {
        next[index + n] = d;
      });
    setValues(next);
    if (digits) refs.current[Math.min(index + digits.length, 5)]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  }
  return (
    <div className="auth-otp" role="group" aria-label="One-time passcode">
      {values.map((v, i) => (
        <input
          className="auth-input"
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          onChange={(e) => update(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            update(i, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || (e.key === "Backspace" && !v))
              refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
