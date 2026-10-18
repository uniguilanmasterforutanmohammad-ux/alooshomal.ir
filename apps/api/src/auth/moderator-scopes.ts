/**
 * Scopes for «کاربر ادمین محدود» (`Role.MODERATOR`).
 *
 * A super admin creates a moderator account and grants it one or more scopes.
 * The moderator then gets a stripped-down review panel that can only
 * approve / edit / reject the matching queues — nothing else in the admin area
 * (users, settings, permissions, revenue…) is reachable.
 *
 * Two families exist:
 *   - content scopes  → moderation queues for biolinks / cards / feeds / news
 *   - request scopes  → monetisation requests («اشتراک»، «تبلیغ صفحه اصلی»،
 *                        «تبلیغ در صدر دایرکتوری»، «پله»)
 *
 * Super admins (`Role.ADMIN`) implicitly hold every scope.
 */

export const MODERATOR_SCOPES = [
  // content moderation
  'BIOLINK',
  'BUSINESS_CARD',
  'FEED',
  'NEWS',
  // monetisation requests
  'SUBSCRIPTION_REQUESTS',
  'AD_REQUESTS',
  'DIRECTORY_AD_REQUESTS',
  'BOOST_REQUESTS',
] as const;
export type ModeratorScope = (typeof MODERATOR_SCOPES)[number];

/** The subset that drives the moderation queues (business-card/feed/news/…). */
export const CONTENT_SCOPES: ModeratorScope[] = [
  'BIOLINK',
  'BUSINESS_CARD',
  'FEED',
  'NEWS',
];

/** The subset that drives the monetisation request queues. */
export const REQUEST_SCOPES: ModeratorScope[] = [
  'SUBSCRIPTION_REQUESTS',
  'AD_REQUESTS',
  'DIRECTORY_AD_REQUESTS',
  'BOOST_REQUESTS',
];

export interface ModeratorScopeMeta {
  scope: ModeratorScope;
  group: 'محتوا' | 'درخواست‌ها';
  label: string;
  hint: string;
}

export const MODERATOR_SCOPE_META: ModeratorScopeMeta[] = [
  {
    scope: 'BIOLINK',
    group: 'محتوا',
    label: 'بیولینک‌ها',
    hint: 'تأیید، ویرایش و رد بیولینک‌ها',
  },
  {
    scope: 'BUSINESS_CARD',
    group: 'محتوا',
    label: 'کارت‌های ویزیت',
    hint: 'تأیید، ویرایش و رد کارت‌های ویزیت',
  },
  {
    scope: 'FEED',
    group: 'محتوا',
    label: 'فیدها',
    hint: 'تأیید، ویرایش و رد پست‌های فید',
  },
  {
    scope: 'NEWS',
    group: 'محتوا',
    label: 'نبض شهر (خبرها)',
    hint: 'تأیید، ویرایش و رد خبرهای شهروندخبرنگارها',
  },
  {
    scope: 'SUBSCRIPTION_REQUESTS',
    group: 'درخواست‌ها',
    label: 'اشتراک‌ها',
    hint: 'تأیید یا رد درخواست اشتراک کاربران',
  },
  {
    scope: 'AD_REQUESTS',
    group: 'درخواست‌ها',
    label: 'تبلیغ صفحه اصلی',
    hint: 'تأیید یا رد درخواست تبلیغ در جعبه‌ی صفحه اصلی',
  },
  {
    scope: 'DIRECTORY_AD_REQUESTS',
    group: 'درخواست‌ها',
    label: 'تبلیغ در صدر دایرکتوری',
    hint: 'تأیید یا رد درخواست تبلیغ در بالای دایرکتوری',
  },
  {
    scope: 'BOOST_REQUESTS',
    group: 'درخواست‌ها',
    label: 'پله (افزایش بازدید)',
    hint: 'تأیید یا رد درخواست‌های پله',
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
