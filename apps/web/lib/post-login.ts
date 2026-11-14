type LoginRole = 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN';

/**
 * Where to send a freshly signed-in account. `/login` is shared by every role,
 * so the default `/dashboard` target is replaced by the panel that actually
 * belongs to admins and moderators. An explicit `?next=` target is honoured.
 */
export function postLoginPath(
  next: string,
  role?: LoginRole | null,
): string {
  if (next !== '/dashboard') return next;
  if (role === 'ADMIN') return '/jga4rm8j';
  if (role === 'MODERATOR') return '/moderator';
  return next;
}
