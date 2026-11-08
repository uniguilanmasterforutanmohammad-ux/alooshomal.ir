import { toast } from '../toast';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const VISITOR_STORAGE_KEY = 'alooshomal_visitor';

/**
 * Single-flight refresh promise. When several requests fail with 401 at the
 * same moment they all await the same token exchange instead of racing and
 * burning the (rotating) refresh token.
 */
let refreshInFlight: Promise<boolean> | null = null;

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

async function refreshSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      // The refresh token lives in an HttpOnly cookie, so the request only has
      // to ask for a rotation — no token is read or sent by JS.
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { data?: RefreshResult };
      if (!payload?.data?.accessToken) return false;
      window.localStorage.setItem('alooshomal_token', payload.data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * A random per-browser id used to attribute likes without requiring login.
 * Persisted in localStorage so a visitor can only like an item once.
 */
function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await send<T>(path, options, 0);
  return parse<T>(response);
}

/**
 * Performs the request, transparently refreshing an expired access token once.
 * A 401 with a stored refresh token triggers a silent rotation and one retry;
 * a second 401 (or no refresh token) is surfaced to the caller so it can send
 * the user back to the login page.
 */
async function send<T>(
  path: string,
  options: RequestInit,
  attempt: number,
): Promise<Response> {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('alooshomal_token')
      : null;

  const visitorId = getVisitorId();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      // FormData sets its own multipart boundary; only default to JSON when the
      // caller hasn't supplied a body form.
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(visitorId ? { 'x-visitor-id': visitorId } : {}),
      ...(options.headers ?? {}),
    },
    // Required so the HttpOnly refresh cookie is sent to the API origin.
    credentials: 'include',
    cache: 'no-store',
  });

  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/phone/') ||
    path.startsWith('/auth/register');

  if (response.status === 401 && attempt === 0 && !isAuthEndpoint) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return send<T>(path, options, 1);
    }
    // Refresh failed: clear the dead session so the UI can redirect to login.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('alooshomal_token');
      window.dispatchEvent(new Event('alooshomal:session-expired'));
    }
  }
  return response;
}

async function parse<T>(response: Response): Promise<T> {

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string; code?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? Array.isArray(payload.message)
          ? payload.message.join('، ')
          : String(payload.message)
        : 'خطا در ارتباط با سرور';
    const code =
      payload && 'code' in payload && typeof payload.code === 'string'
        ? payload.code
        : undefined;
    const error = new ApiError(message, response.status, code);
    // Surface every failed request as a dismissible bubble (10s) so no error
    // passes silently — the page-level banner remains for inline context.
    if (typeof window !== 'undefined') {
      toast.error(message, 'خطا');
    }
    throw error;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** multipart/form-data POST (file uploads). */
  upload: <T>(path: string, body: FormData) =>
    request<T>(path, { method: 'POST', body }),
};
