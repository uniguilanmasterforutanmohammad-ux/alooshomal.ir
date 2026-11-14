import type { AdminNotifyCategory } from '../settings/settings.constants';

/**
 * The two placeholders of Melipayamak's fixed admin-notification template:
 *
 *   کاربر مدیریت بخش {0} شما یک درخواست با موضوع {1} دارید. shomalicard
 *
 * Keep both values short and in Persian. When a new admin notification is
 * added, either rely on the category default below or pass an explicit
 * `sms: { section, subject }` at the call site.
 */
export interface AdminSmsContent {
  section: string;
  subject: string;
}

export const ADMIN_SMS_BY_CATEGORY: Record<
  AdminNotifyCategory,
  AdminSmsContent
> = {
  NEW_USER: { section: 'کاربران', subject: 'ثبت‌نام کاربر جدید' },
  BIOLINK: { section: 'بیولینک', subject: 'درخواست بیولینک' },
  BUSINESS_CARD: { section: 'کارت ویزیت', subject: 'درخواست کارت ویزیت' },
  SUBSCRIPTION: { section: 'اشتراک', subject: 'درخواست اشتراک' },
  BOOST: { section: 'پله', subject: 'درخواست پله' },
  AD: { section: 'تبلیغات', subject: 'درخواست تبلیغ' },
  FEED: { section: 'فید', subject: 'درخواست فید' },
  FEED_COMMENT: { section: 'فید', subject: 'کامنت جدید فید' },
  TICKET: { section: 'تیکت', subject: 'تیکت پشتیبانی' },
  SECURITY: { section: 'امنیت', subject: 'رویداد امنیتی' },
  SYSTEM: { section: 'سیستم', subject: 'اطلاع‌رسانی سیستم' },
  TAXONOMY: { section: 'دسته‌بندی', subject: 'درخواست دسته‌بندی' },
  REPORT: { section: 'گزارش‌ها', subject: 'گزارش جدید' },
};

export function adminSmsContent(
  category: AdminNotifyCategory | undefined,
  override?: AdminSmsContent,
): AdminSmsContent | null {
  if (override) return override;
  return category ? ADMIN_SMS_BY_CATEGORY[category] ?? null : null;
}
