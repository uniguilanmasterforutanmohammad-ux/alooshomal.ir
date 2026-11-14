import { currentRequestOrigin } from './request-origin';

/**
 * Absolute base URL of the public web app. Used to build share links, card
 * callback URLs and QR payloads from the API side.
 */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

/**
 * Whether an origin is a real, publicly reachable web origin.
 *
 * Docker-internal names such as `api:4000` and loopback addresses are rejected
 * so they are never sent to a payment gateway as the customer return URL.
 */
export function isPublicOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host)) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;
  // Service names inside Docker (`api`, `web`, …) have no dot.
  if (!host.includes('.')) return false;
  if (
    /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  ) {
    return false;
  }
  return true;
}

/**
 * Base URL for payment-gateway return URLs.
 *
 * Priority:
 *   1. `PAYPING_RETURN_BASE_URL` — explicit origin matching the merchant panel.
 *   2. The origin of the current request (the domain the customer is on).
 *   3. `NEXT_PUBLIC_APP_URL` — canonical/build-time domain.
 *
 * Using the request origin fixes gateways that only accept callbacks on the
 * domain registered for the merchant (PayPing error 105) when the build-time
 * `NEXT_PUBLIC_APP_URL` points at a different alias of the same site.
 */
export function paypingReturnBaseUrl(): string {
  const explicit = process.env.PAYPING_RETURN_BASE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      return explicit.replace(/\/+$/, '');
    }
  }
  const origin = currentRequestOrigin();
  if (origin && isPublicOrigin(origin)) return origin;
  return appUrl().replace(/\/+$/, '');
}
