/**
 * Registry of the social platforms the «شمالی کارت» brand accounts live on.
 *
 * Kept as data (not a database enum) so adding a platform is a one-line change
 * that the admin panel picks up automatically — the same registry powers both
 * the form's platform list and the API validation. `OTHER` keeps a home for a
 * network that is not listed yet.
 */
export interface SocialPlatformMeta {
  key: string;
  label: string;
  hint: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformMeta[] = [
  { key: 'INSTAGRAM', label: 'اینستاگرام', hint: 'نام کاربری نمونه: shomalicard' },
  { key: 'BALE', label: 'بله', hint: 'نام کاربری یا شماره‌ی حساب' },
  { key: 'EITAA', label: 'ایتا', hint: 'نام کاربری یا شماره‌ی حساب' },
  { key: 'APARAT', label: 'آپارات', hint: 'نام کاربری کانال آپارات' },
  { key: 'TELEGRAM', label: 'تلگرام', hint: 'نام کاربری کانال/گروه' },
  { key: 'WHATSAPP', label: 'واتساپ', hint: 'شماره‌ی تجاری واتساپ' },
  { key: 'LINKEDIN', label: 'لینکدین', hint: 'نشانی صفحه‌ی شرکت' },
  { key: 'OTHER', label: 'سایر', hint: 'هر شبکه‌ی دیگر' },
];

export const SOCIAL_PLATFORM_KEYS = SOCIAL_PLATFORMS.map((item) => item.key);

const labelsByKey = new Map(SOCIAL_PLATFORMS.map((item) => [item.key, item.label]));

export function socialPlatformLabel(key: string): string {
  return labelsByKey.get(key) ?? key;
}

/** Activity-log action keys so every change to a stored credential is auditable. */
export const SOCIAL_ACCOUNT_ACTIONS = {
  created: 'SOCIAL_ACCOUNT_CREATED',
  updated: 'SOCIAL_ACCOUNT_UPDATED',
  deleted: 'SOCIAL_ACCOUNT_DELETED',
  revealed: 'SOCIAL_ACCOUNT_REVEALED',
} as const;
