/**
 * Role-based permission matrix.
 *
 * The admin panel shows a grid of permission *subjects* × roles and lets the
 * admin tick which role may do what. Values are stored one row per cell in the
 * `Setting` table (`perm.<subject>.<role>` = "true"/"false") and default to the
 * table below when a row is missing, so an untouched install keeps working.
 *
 * Enforcement lives in `PermissionsService.can()` and is applied by the
 * `@RequirePermission('subject')` guard on protected endpoints.
 */

export type AppRoleName = 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';

export const APP_ROLES: AppRoleName[] = ['USER', 'CITIZEN_REPORTER', 'ADMIN'];

export const ROLE_LABELS: Record<AppRoleName, string> = {
  USER: 'کاربر',
  CITIZEN_REPORTER: 'شهروند خبرنگار',
  ADMIN: 'مدیر',
};

export const PERMISSION_SUBJECTS = [
  // --- content ---
  'BIOLINK_CREATE',
  'BIOLINK_EDIT',
  'BUSINESS_CARD_CREATE',
  'BUSINESS_CARD_EDIT',
  'NEWS_CREATE',
  'NEWS_EDIT_OWN',
  'NEWS_APPROVE',
  // --- engagement ---
  'LIKE',
  'SAVE',
  'BOOST_REQUEST',
  'SUBSCRIPTION_REQUEST',
  // --- support ---
  'TICKET_CREATE',
  // --- account ---
  'PROFILE_CHANGE_REQUEST',
] as const;
export type PermissionSubject = (typeof PERMISSION_SUBJECTS)[number];

export interface PermissionSubjectMeta {
  subject: PermissionSubject;
  /** Group heading shown above the subject in the admin grid. */
  group: string;
  label: string;
  hint: string;
}

export const PERMISSION_META: PermissionSubjectMeta[] = [
  {
    subject: 'BIOLINK_CREATE',
    group: 'محتوا',
    label: 'ساخت بیولینک',
    hint: 'ایجاد بیولینک جدید',
  },
  {
    subject: 'BIOLINK_EDIT',
    group: 'محتوا',
    label: 'ویرایش بیولینک',
    hint: 'ویرایش بیولینک خود',
  },
  {
    subject: 'BUSINESS_CARD_CREATE',
    group: 'محتوا',
    label: 'ساخت کارت ویزیت',
    hint: 'ایجاد کارت ویزیت جدید',
  },
  {
    subject: 'BUSINESS_CARD_EDIT',
    group: 'محتوا',
    label: 'ویرایش کارت ویزیت',
    hint: 'ویرایش کارت ویزیت خود',
  },
  {
    subject: 'NEWS_CREATE',
    group: 'نبض شهر',
    label: 'ثبت خبر',
    hint: 'ارسال خبر جدید برای بررسی',
  },
  {
    subject: 'NEWS_EDIT_OWN',
    group: 'نبض شهر',
    label: 'ویرایش خبر خود',
    hint: 'ویرایش یا حذف خبر ثبت‌شده توسط خود',
  },
  {
    subject: 'NEWS_APPROVE',
    group: 'نبض شهر',
    label: 'تأیید خبر',
    hint: 'تأیید یا رد خبرهای کاربران',
  },
  { subject: 'LIKE', group: 'تعامل', label: 'پسندیدن', hint: 'لایک بیولینک/کارت' },
  {
    subject: 'SAVE',
    group: 'تعامل',
    label: 'ذخیره‌کردن',
    hint: 'ذخیره بیولینک/کارت در فهرست من',
  },
  {
    subject: 'BOOST_REQUEST',
    group: 'تعامل',
    label: 'درخواست افزایش بازدید',
    hint: 'ثبت درخواست پله',
  },
  {
    subject: 'SUBSCRIPTION_REQUEST',
    group: 'اشتراک',
    label: 'درخواست اشتراک',
    hint: 'خرید/تمدید اشتراک',
  },
  {
    subject: 'TICKET_CREATE',
    group: 'پشتیبانی',
    label: 'ثبت تیکت',
    hint: 'ارسال تیکت پشتیبانی',
  },
  {
    subject: 'PROFILE_CHANGE_REQUEST',
    group: 'حساب',
    label: 'درخواست تغییر پروفایل',
    hint: 'ارسال درخواست تغییر نام',
  },
];

const metaBySubject = new Map(PERMISSION_META.map((m) => [m.subject, m]));
export function permissionMeta(subject: string): PermissionSubjectMeta | undefined {
  return metaBySubject.get(subject as PermissionSubject);
}

/** Default matrix: what each role may do before the admin changes anything. */
export const DEFAULT_PERMISSIONS: Record<AppRoleName, PermissionSubject[]> = {
  USER: [
    'BIOLINK_CREATE',
    'BIOLINK_EDIT',
    'BUSINESS_CARD_CREATE',
    'BUSINESS_CARD_EDIT',
    'LIKE',
    'SAVE',
    'BOOST_REQUEST',
    'SUBSCRIPTION_REQUEST',
    'TICKET_CREATE',
    'PROFILE_CHANGE_REQUEST',
  ],
  CITIZEN_REPORTER: [
    'BIOLINK_CREATE',
    'BIOLINK_EDIT',
    'BUSINESS_CARD_CREATE',
    'BUSINESS_CARD_EDIT',
    'NEWS_CREATE',
    'NEWS_EDIT_OWN',
    'LIKE',
    'SAVE',
    'BOOST_REQUEST',
    'SUBSCRIPTION_REQUEST',
    'TICKET_CREATE',
    'PROFILE_CHANGE_REQUEST',
  ],
  // Admins implicitly hold every permission; the matrix is not authoritative
  // for them (the guard short-circuits on ADMIN).
  ADMIN: [...PERMISSION_SUBJECTS],
};

export function permissionKey(subject: PermissionSubject, role: AppRoleName): string {
  return `perm.${subject}.${role}`;
}

export const PERMISSION_KEY_PREFIX = 'perm.';
