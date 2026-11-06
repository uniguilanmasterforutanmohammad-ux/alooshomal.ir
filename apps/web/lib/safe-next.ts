/**
 * Validate a `?next=` target before navigating to it after login.
 *
 * Only same-origin absolute paths are allowed. Besides rejecting `//host`,
 * backslashes are rejected too: browsers normalise `/\evil.com` to
 * `//evil.com`, which would otherwise turn the login page into an open redirect.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\') || /[\u0000-\u001f]/.test(value)) return fallback;
  if (/^\/%2f|^\/%5c/i.test(value)) return fallback;
  return value;
}
