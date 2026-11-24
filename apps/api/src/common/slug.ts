/**
 * URL-safe slug for Persian/English titles.
 *
 * Keeps Unicode letters/digits (so Persian slugs stay readable), collapses
 * whitespace/ZWNJ and punctuation into single dashes, and optionally caps the
 * length. Returns an empty string when nothing usable remains, so callers can
 * decide on their own fallback (e.g. `post-<timestamp>`).
 */
export function slugify(value: string, maxLength?: number): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[\s\u200c]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!maxLength || base.length <= maxLength) return base;
  return base.slice(0, maxLength).replace(/-+$/, '');
}
