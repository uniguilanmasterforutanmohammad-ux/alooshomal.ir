/**
 * Content-moderation scopes for «کاربر ادمین محدود» (`Role.MODERATOR`).
 *
 * A super admin creates a moderator account and grants it one or more of the
 * scopes below. The moderator then gets a stripped-down review panel that can
 * only approve / edit / reject the matching content type — nothing else in the
 * admin area (users, settings, permissions, revenue…) is reachable.
 *
 * Super admins (`Role.ADMIN`) implicitly hold every scope, so the same guard
 * lets them through without any stored scopes.
 */

export const MODERATOR_SCOPES = [
  'BIOLINK',
  'BUSINESS_CARD',
  'FEED',
  'NEWS',
] as const;
export type ModeratorScope = (typeof MODERATOR_SCOPES)[number];

export interface ModeratorScopeMeta {
  scope: ModeratorScope;
  label: string;
  hint: string;
}

export const MODERATOR_SCOPE_META: ModeratorScopeMeta[] = [
  {
    scope: 'BIOLINK',
    label: 'بیولینک‌ها',
    hint: 'تأیید، ویرایش و رد بیولینک‌ها',
  },
  {
    scope: 'BUSINESS_CARD',
    label: 'کارت‌های ویزیت',
    hint: 'تأیید، ویرایش و رد کارت‌های ویزیت',
  },
  {
    scope: 'FEED',
    label: 'فیدها',
    hint: 'تأیید، ویرایش و رد پست‌های فید',
  },
  {
    scope: 'NEWS',
    label: 'نبض شهر (خبرها)',
    hint: 'تأیید، ویرایش و رد خبرهای شهروندخبرنگارها',
  },
];

const scopeSet = new Set<string>(MODERATOR_SCOPES);

/** Keep only the known scope values, preserving the canonical order. */
export function normalizeScopes(input: unknown): ModeratorScope[] {
  const values = Array.isArray(input) ? input : [];
  return MODERATOR_SCOPES.filter((scope) => values.includes(scope));
}

export function isModeratorScope(value: string): value is ModeratorScope {
  return scopeSet.has(value);
}
