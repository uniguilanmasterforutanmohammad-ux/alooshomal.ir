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

/**
 * Human-readable description of every admin notification case. This is the
 * single source of truth for the admin panel: it lists *what* triggers a
 * notification/SMS and the two template placeholders that are sent.
 */
export interface AdminNotifyDescriptor extends AdminSmsContent {
  /** Short title shown in the admin panel. */
  label: string;
  /** One-line explanation of the event that fires this case. */
  hint: string;
}

export const ADMIN_NOTIFY_REGISTRY: Record<
  AdminNotifyCategory,
  AdminNotifyDescriptor
> = {
  NEW_USER: {
    label: 'ثبت‌نام کاربر جدید',
    hint: 'وقتی کاربر تازه‌ای عضو می‌شود',
    section: 'کاربران',
    subject: 'ثبت‌نام کاربر جدید',
  },
  NEWS: {
    label: 'اخبار شهر',
    hint: 'خبر جدید در انتظار تأیید یا درخواست شهروند خبرنگار',
    section: 'اخبار',
    subject: 'خبر جدید در انتظار تأیید',
  },
  PROFILE: {
    label: 'درخواست تغییر پروفایل',
    hint: 'کاربر درخواست تغییر نام یا مشخصات پروفایل داده است',
    section: 'کاربران',
    subject: 'درخواست تغییر پروفایل',
  },
  BIOLINK: {
    label: 'بیولینک‌ها',
    hint: 'ساخت یا ویرایش بیولینک در انتظار تأیید',
    section: 'بیولینک',
    subject: 'درخواست بیولینک',
  },
  BUSINESS_CARD: {
    label: 'کارت‌های ویزیت',
    hint: 'ساخت یا ویرایش کارت ویزیت در انتظار تأیید',
    section: 'کارت ویزیت',
    subject: 'درخواست کارت ویزیت',
  },
  SUBSCRIPTION: {
    label: 'اشتراک‌ها',
    hint: 'درخواست اشتراک جدید یا پرداخت اشتراک',
    section: 'اشتراک',
    subject: 'درخواست اشتراک',
  },
  BOOST: {
    label: 'افزایش بازدید (پله)',
    hint: 'درخواست پله جدید',
    section: 'پله',
    subject: 'درخواست پله',
  },
  AD: {
    label: 'تبلیغات',
    hint: 'درخواست تبلیغ صفحه‌ی اصلی یا صدر دایرکتوری',
    section: 'تبلیغات',
    subject: 'درخواست تبلیغ',
  },
  FEED: {
    label: 'فیدها',
    hint: 'پست فید یا اشتراک فید جدید در انتظار تأیید',
    section: 'فید',
    subject: 'درخواست فید',
  },
  FEED_COMMENT: {
    label: 'کامنت‌های فید',
    hint: 'کامنت جدید روی پست فید در انتظار تأیید',
    section: 'فید',
    subject: 'کامنت جدید فید',
  },
  TICKET: {
    label: 'تیکت و پشتیبانی آنلاین',
    hint: 'تیکت جدید، پاسخ کاربر یا گفتگوی پشتیبانی',
    section: 'تیکت',
    subject: 'تیکت پشتیبانی',
  },
  SECURITY: {
    label: 'رویدادهای امنیتی',
    hint: 'تغییر شماره موبایل یا ایمیل حساب کاربران',
    section: 'امنیت',
    subject: 'رویداد امنیتی',
  },
  SYSTEM: {
    label: 'اطلاع‌رسانی سیستم',
    hint: 'هشدار منابع سرور و سررسید بدهی کیف پول',
    section: 'سیستم',
    subject: 'اطلاع‌رسانی سیستم',
  },
  TAXONOMY: {
    label: 'درخواست دسته‌بندی تازه',
    hint: 'کاربر در کادر زیردسته/زیرشاخه چیزی پیدا نکرده و درخواست داده است',
    section: 'دسته‌بندی',
    subject: 'درخواست دسته‌بندی',
  },
  REPORT: {
    label: 'گزارش کارت‌ها',
    hint: 'بازدیدکننده کارتی را گزارش کرده (محتوای نامناسب، «این کسب‌وکار برای من است» و …)',
    section: 'گزارش‌ها',
    subject: 'گزارش جدید',
  },
};

export const ADMIN_SMS_BY_CATEGORY: Record<
  AdminNotifyCategory,
  AdminSmsContent
> = Object.fromEntries(
  Object.entries(ADMIN_NOTIFY_REGISTRY).map(([category, descriptor]) => [
    category,
    { section: descriptor.section, subject: descriptor.subject },
  ]),
) as Record<AdminNotifyCategory, AdminSmsContent>;

export function adminSmsContent(
  category: AdminNotifyCategory | undefined,
  override?: AdminSmsContent,
): AdminSmsContent | null {
  if (override) return override;
  return category ? ADMIN_SMS_BY_CATEGORY[category] ?? null : null;
}
