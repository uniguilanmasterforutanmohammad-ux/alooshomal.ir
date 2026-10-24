/**
 * Canonical public origin of the site, used to build absolute URLs in
 * `sitemap.ts`, `robots.ts`, `metadata` (canonical + Open Graph) and JSON-LD.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_APP_URL` — set per environment (.env / compose).
 *   2. `SITE_URL` — optional server-side override for build/deploy.
 *   3. `http://localhost:3000` — local fallback so dev builds never crash.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.SITE_URL ??
  'http://localhost:3000'
).replace(/\/$/, '');

/** Builds an absolute URL for a site-relative path (must start with `/`). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The API base URL used for **server-side** fetches (RSC, sitemap, metadata).
 * Inside Docker this is the internal service address; on the host it falls back
 * to the public one.
 */
export const SERVER_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000/api';

/**
 * Normalises a dynamic route segment for use in an API URL.
 *
 * Next.js may hand a segment over already percent-encoded (a Persian slug like
 * `راهنما-...` can arrive as `%D8%B1...`), so blindly calling
 * `encodeURIComponent` on it double-encodes the value and the API returns 404.
 * Decode first when the value looks encoded, then let the caller (or `URL`)
 * encode once.
 */
export function decodeSlugParam(slug: string): string {
  if (!slug.includes('%')) return slug;
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Strips tags/control chars and trims a string to a meta-description length. */
export function metaDescription(text: string | null | undefined, fallback: string): string {
  if (!text) return fallback;
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}
