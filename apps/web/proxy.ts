import { NextResponse, type NextRequest } from 'next/server';

/**
 * Baseline security headers for every response served by the Next.js app.
 *
 * The API already runs `helmet`, but the web app (which serves the actual
 * HTML) needs its own layer: `next.config.ts` has no headers block and nginx is
 * not always the direct origin (e.g. local dev, previews). This proxy adds
 * defense-in-depth headers the security checklist calls for.
 *
 * Note: Next.js 16 renamed the `middleware` file convention to `proxy` (it now
 * always runs on the Node.js runtime). The logic is unchanged.
 *
 * Notes on the CSP:
 *   - Next.js App Router injects small inline bootstrap scripts and inline
 *     styles, so `'unsafe-inline'` is required for `script-src`/`style-src`
 *     unless a nonce pipeline is wired in. We keep it as a pragmatic baseline
 *     and restrict everything else (`object-src 'none'`, `frame-ancestors`,
 *     `base-uri`, `form-action`).
 *   - `img-src` allows `data:`/`blob:`/`https:` because avatars/logos are served
 *     from the media origin (MinIO via /media) and QR images are data URLs.
 *   - `connect-src` allows the same-origin API proxy and the configured API
 *     origin so `fetch`/SSE keep working.
 */
export function proxy(request: NextRequest) {
  const apiOrigin = (() => {
    try {
      return new URL(
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
      ).origin;
    } catch {
      return '';
    }
  })();

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''} ws: wss:`,
    "manifest-src 'self'",
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // HSTS is only meaningful over HTTPS and is added by nginx in production; on
  // plain-HTTP localhost it would be ignored by browsers anyway.
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains',
    );
  }
  return response;
}

/**
 * Apply to all routes except Next's immutable build assets and the ACME
 * challenge (which must stay reachable for certbot).
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|.well-known/acme-challenge).*)'],
};
