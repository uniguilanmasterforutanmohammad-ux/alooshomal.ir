import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

interface RequestOriginStore {
  origin: string | null;
}

/**
 * Per-request public origin (scheme + host) captured from the proxy headers.
 *
 * Payment callbacks must point at the domain the customer is actually using,
 * which is not necessarily `NEXT_PUBLIC_APP_URL` (the canonical/build-time
 * domain). An AsyncLocalStorage keeps that value available to deep services
 * without threading a `Request` through every checkout call chain.
 */
const storage = new AsyncLocalStorage<RequestOriginStore>();

function firstHeader(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw?.split(',')[0]?.trim();
  return first || undefined;
}

function resolveOrigin(req: Request): string | null {
  // The browser sends `Origin` on cross-origin POSTs. Production may serve the
  // page from `shomalicard.ir` while the API is baked as `alooshomal.ir`, so
  // this header is the only reliable signal of the customer-facing domain.
  const browserOrigin = parseOrigin(firstHeader(req.headers.origin));
  if (browserOrigin && isTrustedBrowserOrigin(browserOrigin)) {
    return browserOrigin;
  }

  const referer = firstHeader(req.headers.referer);
  if (referer) {
    const refererOrigin = parseOrigin(referer);
    // A browser navigation back from the gateway can carry the gateway's own
    // Referer; only trust origins we actually serve.
    if (refererOrigin && isTrustedBrowserOrigin(refererOrigin)) {
      return refererOrigin;
    }
  }

  const host =
    firstHeader(req.headers['x-forwarded-host']) ??
    firstHeader(req.headers.host);
  if (!host) return null;
  const proto =
    firstHeader(req.headers['x-forwarded-proto']) ??
    (req.secure ? 'https' : 'http');
  return parseOrigin(`${proto}://${host}`);
}

function parseOrigin(value: string | undefined): string | null {
  if (!value || value === 'null') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origins we serve the web app from. `CORS_ORIGIN` is the authoritative list
 * in production; the canonical app URL and the explicit gateway base are
 * included as well so a single-domain deployment works without CORS_ORIGIN.
 */
function trustedBrowserOrigins(): string[] {
  const configured = [
    process.env.CORS_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.PAYPING_RETURN_BASE_URL,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value && value !== '*');

  const origins = new Set<string>();
  for (const value of configured) {
    const origin = parseOrigin(value);
    if (origin) origins.add(origin);
  }
  return [...origins];
}

function isTrustedBrowserOrigin(origin: string): boolean {
  const trusted = trustedBrowserOrigins();
  // No explicit list (e.g. local development with `CORS_ORIGIN=*`): accept the
  // browser origin and let the gateway's own domain check be the guard.
  if (trusted.length === 0) return true;
  return trusted.includes(origin);
}

/** Express middleware that makes the current public origin request-scoped. */
export function requestOriginMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  storage.run({ origin: resolveOrigin(req) }, next);
}

/** Public origin of the request being handled, if it can be determined. */
export function currentRequestOrigin(): string | null {
  return storage.getStore()?.origin ?? null;
}
