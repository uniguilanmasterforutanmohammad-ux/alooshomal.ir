'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, MessageSquareWarning, Save } from 'lucide-react';

import { api } from '@/lib/api';

type Category =
  | 'NEW_USER'
  | 'NEWS'
  | 'PROFILE'
  | 'BIOLINK'
  | 'BUSINESS_CARD'
  | 'SUBSCRIPTION'
  | 'BOOST'
  | 'AD'
  | 'FEED'
  | 'FEED_COMMENT'
  | 'TICKET'
  | 'SECURITY'
  | 'SYSTEM'
  | 'TAXONOMY'
  | 'REPORT';

interface CaseDescriptor {
  label: string;
  hint: string;
  section: string;
  subject: string;
}

const FALLBACK: Record<Category, CaseDescriptor> = {
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

const ORDER: Category[] = [
  'NEW_USER',
  'NEWS',
  'PROFILE',
  'BIOLINK',
  'BUSINESS_CARD',
  'SUBSCRIPTION',
  'BOOST',
  'AD',
  'FEED',
  'FEED_COMMENT',
  'TICKET',
  'SECURITY',
  'SYSTEM',
  'TAXONOMY',
  'REPORT',
];

interface SettingsPayload {
  adminNotifications: Record<Category, boolean>;
  adminSmsNotifications: Record<Category, boolean>;
  adminNotifyRegistry?: Record<Category, CaseDescriptor>;
}

interface SmsDelivery {
  enabled: boolean;
  resolvedPhone: string;
  channelReady: boolean;
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <span className="flex flex-col items-center gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          checked
            ? 'border-brand bg-brand'
            : 'border-[var(--vintage-border)] bg-white'
        }`}
      >
        <span
          className={`absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all ${
            checked ? 'start-0.5' : 'start-5.5'
          }`}
        />
      </button>
      <span className="text-[10px] font-bold text-muted">{label}</span>
    </span>
  );
}

/**
 * Per-case switches for admin-facing notifications. Each case has two
 * independent switches:
 *   - «اعلان» — whether the in-app bell row is created.
 *   - «پیامک» — whether Melipayamak sends the admin SMS for that case.
 * The list itself comes from the API registry, so new cases appear here
 * automatically.
 */
export function AdminNotificationSettings() {
  const [prefs, setPrefs] = useState<Record<Category, boolean> | null>(null);
  const [smsPrefs, setSmsPrefs] = useState<Record<Category, boolean> | null>(
    null,
  );
  const [registry, setRegistry] = useState<Record<Category, CaseDescriptor>>(
    FALLBACK,
  );
  const [delivery, setDelivery] = useState<SmsDelivery | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [result, sms] = await Promise.all([
        api.get<SettingsPayload>('/admin/settings'),
        api
          .get<SmsDelivery>('/admin/support/chat/sms-settings')
          .catch(() => null),
      ]);
      setPrefs(result.adminNotifications);
      setSmsPrefs(result.adminSmsNotifications ?? result.adminNotifications);
      if (result.adminNotifyRegistry) setRegistry(result.adminNotifyRegistry);
      setDelivery(sms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(category: Category) {
    setPrefs((prev) => (prev ? { ...prev, [category]: !prev[category] } : prev));
    setMessage(null);
  }

  function toggleSms(category: Category) {
    setSmsPrefs((prev) =>
      prev ? { ...prev, [category]: !prev[category] } : prev,
    );
    setMessage(null);
  }

  async function save() {
    if (!prefs || !smsPrefs) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        adminNotifications: prefs,
        adminSmsNotifications: smsPrefs,
      });
      setPrefs(result.adminNotifications);
      setSmsPrefs(result.adminSmsNotifications ?? result.adminNotifications);
      setMessage('تنظیمات اعلان‌ها و پیامک‌ها ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <BellRing className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">
          اعلان‌ها و پیامک‌های مدیریت
        </h3>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        هر رویداد دو کلید مستقل دارد: «اعلان» زنگوله‌ی پنل مدیریت را پر می‌کند و
        «پیامک» یک پیامک از قالب ملی‌پیامک به شماره‌ی مدیر می‌فرستد. با
        خاموش‌کردن هر کلید، فقط همان کانال برای همان رویداد متوقف می‌شود.
      </p>

      {delivery ? (
        <div
          className={`mt-3 flex items-start gap-2 rounded-lg p-2 text-[11px] leading-5 ${
            !delivery.enabled || !delivery.channelReady
              ? 'bg-amber-50 text-amber-800'
              : 'bg-sky-50 text-sky-800'
          }`}
        >
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {!delivery.enabled
              ? 'ارسال پیامک اطلاع‌رسانی مدیر در «پشتیبانی آنلاین» خاموش است؛ تا روشن‌شدن آن هیچ پیامکی ارسال نمی‌شود.'
              : !delivery.channelReady
                ? 'کانال ملی‌پیامک روی سرور تنظیم نشده است؛ تنظیمات ذخیره می‌شود ولی پیامکی ارسال نمی‌شود.'
                : delivery.resolvedPhone
                  ? `پیامک‌ها به شماره‌ی ${delivery.resolvedPhone} ارسال می‌شوند (قابل تغییر در بخش «پشتیبانی آنلاین»).`
                  : 'هنوز شماره‌ی دریافت پیامک تنظیم نشده است.'}
          </span>
        </div>
      ) : null}

      {!prefs || !smsPrefs ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col divide-y divide-dashed divide-[var(--vintage-border)]">
            {ORDER.map((category) => {
              const info = registry[category] ?? FALLBACK[category];
              return (
                <div
                  key={category}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">
                      {info.label}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {info.hint}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      قالب پیامک: {info.section} — {info.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={prefs[category]}
                      onChange={() => toggle(category)}
                      label="اعلان"
                    />
                    <Switch
                      checked={smsPrefs[category]}
                      onChange={() => toggleSms(category)}
                      label="پیامک"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
        </>
      )}

      {message ? (
        <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
