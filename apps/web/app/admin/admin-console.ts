import type { AdminSection } from '@/components/admin/AdminShell';
import type {
  OverviewStats,
  SignupSeries,
} from '@/components/admin/AdminOverviewWidgets';
import type {
  AdminReport,
  AdminTicket,
  AdminUser,
} from '@/components/admin/AdminTables';

/** A biolink row as returned by `GET /admin/biolinks`. */
export interface AdminBiolink {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  status: string;
  isPublished: boolean;
  user: { email: string; fullName: string | null };
  decidedBy?: { id: string; fullName: string | null; email: string | null } | null;
}

export type AdminBusinessCard = AdminBiolink;

/** Payload of `GET /admin/overview` used by the console dashboard. */
export interface OverviewPayload {
  stats: OverviewStats;
  recentUsers: AdminUser[];
  recentTickets: AdminTicket[];
  reports: AdminReport[];
  signupSeries: SignupSeries;
}

export const EMPTY_STATS: OverviewStats = {
  pending: 0,
  approved: 0,
  rejected: 0,
  published: 0,
  users: 0,
  scans: 0,
  openTickets: 0,
  totalTickets: 0,
  recentUsers: 0,
};

const ADMIN_SECTIONS: AdminSection[] = [
  'overview',
  'biolinks',
  'business-cards',
  'subscriptions',
  'boosts',
  'ads',
  'points',
  'revenue',
  'payments',
  'payping-oauth',
  'feeds',
  'users',
  'emails',
  'tickets',
  'news',
  'blog',
  'permissions',
  'moderators',
  'storage',
  'monitoring',
  'reports',
  'tools',
  'notifications',
  'settings',
  'social-accounts',
];

/** Validates the `?section=` query parameter before it is trusted. */
export function isAdminSection(value: string): value is AdminSection {
  return (ADMIN_SECTIONS as string[]).includes(value);
}

/** Header title/subtitle for every console panel. */
  export const PAGE_HEAD: Record<AdminSection, { title: string; sub: string }> = {
    overview: { title: 'داشبورد مدیریت', sub: 'نمای کلی پلتفرم شما در یک نگاه' },
    biolinks: { title: 'بررسی بیولینک‌ها', sub: 'تأیید، رد و ویرایش بیولینک‌ها' },
    'business-cards': {
      title: 'بررسی کارت‌های ویزیت',
      sub: 'تأیید، رد و ویرایش کارت‌های ویزیت',
    },
    subscriptions: { title: 'اشتراک‌ها', sub: 'مدیریت بسته‌ها و تأیید درخواست کاربران' },
    boosts: { title: 'افزایش بازدید', sub: 'بررسی و تأیید درخواست‌های پله' },
    ads: { title: 'تبلیغات', sub: 'تأیید درخواست‌های تبلیغ و تنظیمات نمایش' },
    points: { title: 'امتیازها', sub: 'مدیریت جوایز، امتیاز هر خبر و دریافت‌ها' },
    revenue: {
      title: 'گزارش درآمد',
      sub: 'برآورد درآمد هر مدل درآمدی و تعیین قیمت واحد',
    },
    feeds: { title: 'فیدها', sub: 'بررسی پست‌ها، اشتراک‌ها، بسته‌ها و تنظیمات' },
    users: { title: 'کاربران', sub: 'لیست کاربران پلتفرم' },
    emails: { title: 'ایمیل‌های ارسالی', sub: 'ایمیل‌های تراکنشی ارسال‌شده به کاربران' },
    tickets: { title: 'تیکت‌ها', sub: 'مدیریت تیکت‌های پشتیبانی' },
    news: {
      title: 'شهروند خبرنگار',
      sub: 'بررسی خبرهای شهروند خبرنگارها، درخواست‌ها و دسته‌بندی‌ها',
    },
    blog: {
      title: 'بلاگ',
      sub: 'نوشتن و انتشار مطالب بلاگ همراه با ویدیوی آپارات',
    },
    permissions: {
      title: 'سطوح دسترسی',
      sub: 'تعیین دسترسی هر نقش به امکانات پلتفرم',
    },
    moderators: {
      title: 'کاربران ادمین محدود',
      sub: 'ساخت حساب کاربر ادمین با تعیین سطح دسترسی برای بررسی محتوا',
    },
    storage: {
      title: 'فضای سرور',
      sub: 'حجم آپلودهای رسانه، ریشه‌ی باکت و فضای هارد دیسک سرور',
    },
    monitoring: {
      title: 'پایش منابع سرور',
      sub: 'مصرف رم، پردازنده و دیسک و تنظیم آستانه‌ی ارسال هشدار به ایمیل و موبایل',
    },
    payments: {
      title: 'درگاه پرداخت پی‌پینگ',
      sub: 'تراکنش‌ها، تسویه، مشتریان، کد تخفیف، فاکتور، اقساطی و استعلام',
    },
    'payping-oauth': {
      title: 'درگاه پرداخت پی‌پینگ (OAuth)',
      sub: 'اتصال با ClientId/ClientSecret و آزمایش دسترسی‌های واقعی این توکن',
    },
    reports: {
      title: 'گزارش‌های سیستم',
      sub: 'تاریخچه‌ی رویدادها و اقدامات ثبت‌شده در پلتفرم',
    },
    tools: { title: 'ابزار تست', sub: 'ایمپورت گروهی، حذف داده‌های تستی و قفل ساخت' },
    notifications: {
      title: 'اعلانات',
      sub: 'تاریخچه‌ی کامل اعلانات مدیران',
    },
    settings: {
      title: 'تنظیمات',
      sub: 'ویژگی‌ها و دسترسی‌ها، شهرها، کسب‌وکارها و نمایش دایرکتوری',
    },
    'social-accounts': {
      title: 'شبکه‌های اجتماعی شمالی کارت',
      sub: 'نگه‌داری ایمن اکانت، نام کاربری و رمز عبور حساب‌های برند',
    },
  };
