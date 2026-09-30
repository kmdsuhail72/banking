# Authentication frontend

Start the existing Next.js app with `pnpm --filter @banking/frontend dev`, then visit `/auth/login` (port 3001). Legacy authentication pages are preserved. Dashboard navigation includes a Security link.

## Implemented

- Responsive split-screen brand and form shell, shared password fields, show/hide controls, Caps Lock feedback, accessible six-box OTP with paste and keyboard support.
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/verify-phone`, `/auth/mfa/setup`, `/auth/mfa/challenge`, `/auth/sessions`, `/auth/lock`.
- Five-step registration with age/name validation, optional device-local profile drafts and a resume prompt, document selection/drop validation, security preferences and editable review. Passwords and identity files are never persisted to browser storage. Draft persistence is opt-in because profiles contain personal information.
- MFA challenge token stays in memory. A reload requires signing in again. Backup codes are fetched only after enablement and can be copied or downloaded.
- Cookie-based session bootstrap and single-flight refresh; expired requests retry once. Access tokens no longer use localStorage. Expired dashboard sessions redirect with a local `next` destination.
- Idle lock after ten minutes for authenticated non-demo users. A native modal keeps the underlying page mounted and traps focus. The `auth:lock` browser event can request the same overlay. Escape cannot bypass reauthentication.
- Active-session listing, individual revocation and a confirmation dialog for revoking other sessions. Empty/error states do not show fabricated sessions.

## Backend dependencies and differences from the supplied spec

The existing controller implements basic registration, email/password login, refresh, logout, password recovery, email verification and `/me`. It does **not** currently implement the following contracts. Their frontend flows show server errors until these are implemented:

| Contract                          | Expected response / requirement                                                                                                                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/kyc/documents` | Proposed upload adapter: `{ filename, content: data URL, slot }` returns `{ id }`. Replace with the production upload contract, preferably signed object-storage uploads. Account creation waits for successful upload references. |
| `POST /api/v1/auth/register`      | Extend validation to accept `profile`, `kyc`, `preferences`, and `termsAccepted`, alongside the existing flat identity fields. Process these atomically and clean up abandoned uploads.                                            |
| `POST /api/v1/auth/login/mfa`     | `{ mfaToken, code, method, trustDevice }` returns access token. Login must return `{ mfaRequired, mfaToken }` before issuing normal tokens when MFA is required.                                                                   |
| MFA setup / enable / backup codes | Setup returns `{ qr, secret }`; QR image may be an image data URL or HTTPS URL. Enable accepts `{ code }`; backup codes returns `{ codes: string[] }`.                                                                             |
| Phone verification / resend       | Accept phone/code and channel/target as in the spec; challenge SMS resend accepts the in-memory MFA token. Enforce attempts, expirations and lockouts on the server.                                                               |
| Sessions GET / DELETE             | GET returns an array or `{ sessions }`, with id, device/userAgent, location, ip, lastActiveAt, and current/isCurrent. DELETE supports one id or all other sessions.                                                                |
| `POST /api/v1/auth/reauth`        | Proposed missing contract: `{ password }` returns `{ elevatedToken }`. Must enforce a five-minute elevated scope server-side. Sensitive-operation consumers are not yet connected to this token.                                   |

The existing login DTO accepts email, not usernames. The UI therefore asks for email. The server currently controls a seven-day SameSite=Lax refresh cookie; the frontend sends rememberMe but cannot enforce the spec’s thirty-day/session-only Secure, Strict cookie policy. CSRF issuance/validation also requires a server contract. Frontend locks and route guards are not security enforcement boundaries.

Additional spec items not implemented: social OAuth providers, live email-uniqueness lookup, registration phone OTP gating, inline authenticator setup within registration, webcam capture, document thumbnails, zxcvbn strength estimation, Framer transitions, backup-code printing/regeneration, MFA disabling, and MSW/Playwright suites. The password display is explicitly a requirements checklist, not an entropy estimate. Zustand and TanStack Query were not introduced; these flows use the existing React context and fetch client. Legal document URLs must be supplied before production onboarding.

## Validation

- `node --test apps/frontend/tests/auth-api.test.cjs`: memory-only token behavior, concurrent refresh deduplication, failed-refresh cleanup, login failure behavior, bounded retry.
- `node_modules/.bin/tsc --noEmit --incremental false -p apps/frontend/tsconfig.json`.
- HTTP smoke checks for all ten routes.
- Browser visual and interaction verification still needs a connected browser; none was available in this session.
