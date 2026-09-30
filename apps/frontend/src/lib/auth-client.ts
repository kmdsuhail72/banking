import { api } from "./api";
let mfaToken: string | null = null;
export const setMfaToken = (token: string | null) => {
  mfaToken = token;
};
export const getMfaToken = () => mfaToken;
export const authRequest = <T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method?: string,
) =>
  api<T>(
    `/api/v1/auth/${path}`,
    {
      method: method || (body === undefined ? "GET" : "POST"),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    false,
  );
export function authError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  if (status === 429)
    return "Too many attempts. Please wait before trying again.";
  if (status === 404 || status === 501)
    return "This service is not available yet. Please try again later.";
  if (error instanceof TypeError)
    return "Can’t reach the server. Check your connection and try again.";
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Please try again.";
}
export function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\") &&
    !next.startsWith("/auth/")
    ? next
    : "/dashboard";
}
