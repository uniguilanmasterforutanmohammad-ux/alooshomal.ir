import type { Request, Response } from 'express';

/**
 * Refresh-token cookie policy.
 *
 * The refresh token is the long-lived credential, so it lives in an
 * `HttpOnly` cookie instead of `localStorage`: JavaScript (and therefore any
 * XSS payload) cannot read it, and the browser only ever sends it to the API.
 *
 *   * `HttpOnly`  — unreachable from JS.
 *   * `Secure`    — HTTPS-only in production (off locally so dev over http works).
 *   * `SameSite=Lax` — blocks cross-site POSTs (CSRF) while still allowing the
 *     top-level navigation. The production web and API share the same origin
 *     (`/api`), and localhost ports count as same-site, so lax is enough.
 *   * `Path=/api/auth` — the cookie is only attached to auth calls (login,
 *     refresh, logout), never to ordinary API traffic.
 *   * `Max-Age`   — the *idle* window; every rotation re-issues it, so an active
 *     user stays signed in while an idle browser drops the cookie after 7 days.
 */
export const REFRESH_COOKIE = 'alooshomal_rt';

/** Idle lifetime of the cookie (mirrors the server-side session idle window). */
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
}

/** Minimal Cookie-header parser — avoids pulling in `cookie-parser`. */
export function readRefreshCookie(req: Request, name = REFRESH_COOKIE): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim()) || null;
    }
  }
  return null;
}
