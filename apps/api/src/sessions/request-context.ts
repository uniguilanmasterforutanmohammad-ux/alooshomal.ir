import type { Request } from 'express';

/** Extracts the client IP, honouring the reverse proxy in front of the API. */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (first?.trim() || req.ip || null) ?? null;
}

/** Extracts the raw User-Agent header (best-effort device hint). */
export function clientUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return (Array.isArray(ua) ? ua[0] : ua) ?? null;
}
