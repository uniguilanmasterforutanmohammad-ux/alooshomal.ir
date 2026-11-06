import type { Request } from 'express';

/**
 * Extracts the client IP.
 *
 * Express derives `req.ip` from the socket and only consults
 * `X-Forwarded-For` when `trust proxy` is configured (see `main.ts`). Parsing
 * the header here instead would let any client spoof its address and bypass
 * the per-IP rate limits on login/OTP/registration.
 */
export function clientIp(req: Request): string | null {
  return req.ip ?? null;
}

/** Extracts the raw User-Agent header (best-effort device hint). */
export function clientUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return (Array.isArray(ua) ? ua[0] : ua) ?? null;
}
