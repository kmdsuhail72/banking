const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let accessToken: string | null = null;

if (typeof window !== 'undefined') {
  try { localStorage.removeItem('access_token'); } catch { /* Storage may be disabled. */ }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let refreshing: Promise<void> | null = null;
export function refreshAccessToken(): Promise<void> {
  if (!refreshing) refreshing = (async () => {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('Session expired. Please sign in again.');
    const data = await response.json();
    const token = data.accessToken || data.tokens?.accessToken;
    if (!token) throw new Error('Invalid session response.');
    setAccessToken(token);
  })().catch(error => { setAccessToken(null); throw error; }).finally(() => { refreshing = null; });
  return refreshing;
}

export interface ApiErrorResponse {
  statusCode?: number;
  message: string | string[];
  error?: string;
}

import { DEMO_TOKEN, handleDemoApi } from './demo-data';

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const token = getAccessToken();

  // If in demo mode, serve from demo data store
  if (token === DEMO_TOKEN) {
    const demoResponse = handleDemoApi(path, options);
    if (demoResponse !== undefined) {
      return demoResponse as T;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && retryOn401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    // Attempt automatic refresh
    try {
      await refreshAccessToken();
      return api<T>(path, options, false);
    } catch {
      setAccessToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
    }
  }

  const contentType = response.headers.get('content-type');
  if (response.status === 401 && !retryOn401 && !path.includes('/auth/')) {
    setAccessToken(null);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
  }
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data.message)) {
        errorMsg = data.message.join(', ');
      } else if (data.message) {
        errorMsg = data.message;
      } else if (data.error) {
        errorMsg = data.error;
      }
    } else if (typeof data === 'string' && data.length > 0) {
      errorMsg = data;
    }
    const error: any = new Error(errorMsg);
    error.status = response.status;
    const retryAfter = response.headers.get('retry-after');
    error.retryAfter = retryAfter ? (Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : Math.max(0, Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000))) : undefined;
    error.data = data;
    throw error;
  }

  return data as T;
}
