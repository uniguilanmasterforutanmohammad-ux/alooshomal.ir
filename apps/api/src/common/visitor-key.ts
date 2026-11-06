import { createHash } from 'node:crypto';
import type { Request } from 'express';

/**
 * Stable, anonymous identifier for a directory visitor.
 *
 * The web app generates a random id per browser (`alooshomal_visitor`) and sends
 * it as the `x-visitor-id` header, so likes persist across requests. When the
 * header is missing we fall back to a hash of the client IP + user agent, which
 * is good enough to prevent trivial duplicate likes on public pages.
 */
export function visitorKeyFrom(request: Request): string {
  const header = request.headers['x-visitor-id'];
  const value = Array.isArray(header) ? header[0] : header;
  if (value && value.trim()) {
    return `v:${createHash('sha256').update(value.trim()).digest('hex').slice(0, 32)}`;
  }
  // `request.ip` already honours the configured `trust proxy` hop count; using
  // the raw header here would let a client choose a fresh identity per request.
  const rawIp = request.ip ?? request.socket.remoteAddress ?? 'unknown';
  const ua = request.headers['user-agent'] ?? '';
  return `i:${createHash('sha256').update(`${rawIp}|${ua}`).digest('hex').slice(0, 32)}`;
}
