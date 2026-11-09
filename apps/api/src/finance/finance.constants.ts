/**
 * Stable identifiers for every sale source archived by the finance module.
 *
 * `sourceType` is stored as free text in the database (so a future feature can
 * add a source without a schema migration), but every current payment flow uses
 * one of these constants. When a new paid feature ships, call
 * `FinanceService.recordSale({ sourceType: 'YOUR_NEW_SOURCE', sourceId, ... })`
 * from the point where its payment becomes PAID.
 */
export const FINANCE_SOURCE_TYPES = {
  SUBSCRIPTION: 'SUBSCRIPTION_PAYMENT',
  BOOST: 'BOOST_PAYMENT',
  AD_HOME: 'AD_HOME_PAYMENT',
  AD_DIRECTORY: 'AD_DIRECTORY_PAYMENT',
  FEED_TAG: 'FEED_TAG',
  WALLET: 'WALLET_PAYMENT',
  MANUAL: 'MANUAL_SALE',
} as const;

export type FinanceSourceType =
  (typeof FINANCE_SOURCE_TYPES)[keyof typeof FINANCE_SOURCE_TYPES];

/** Persian labels for the source filter and the revenue breakdown. */
export const FINANCE_SOURCE_LABELS: Record<string, string> = {
  [FINANCE_SOURCE_TYPES.SUBSCRIPTION]: 'خرید اشتراک',
  [FINANCE_SOURCE_TYPES.BOOST]: 'پله (افزایش بازدید)',
  [FINANCE_SOURCE_TYPES.AD_HOME]: 'تبلیغ صفحه اصلی',
  [FINANCE_SOURCE_TYPES.AD_DIRECTORY]: 'تبلیغ دایرکتوری',
  [FINANCE_SOURCE_TYPES.FEED_TAG]: 'تگ فید',
  [FINANCE_SOURCE_TYPES.WALLET]: 'تسویه کیف پول',
  [FINANCE_SOURCE_TYPES.MANUAL]: 'فروش دستی',
};

/** Suggested expense categories; the field itself accepts any label. */
export const EXPENSE_CATEGORY_SUGGESTIONS = [
  'سرور و زیرساخت',
  'سرویس پیامک',
  'سرویس ایمیل',
  'دامنه و SSL',
  'تبلیغات',
  'حقوق و دستمزد',
  'نرم‌افزار و اشتراک',
  'درگاه پرداخت',
  'سایر',
] as const;

export const DEFAULT_FINANCE_PAGE_SIZE = 20;
