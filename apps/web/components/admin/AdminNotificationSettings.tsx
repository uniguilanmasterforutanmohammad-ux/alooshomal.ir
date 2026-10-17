'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Save } from 'lucide-react';

import { api } from '@/lib/api';

type Category =
  | 'NEW_USER'
  | 'BIOLINK'
  | 'BUSINESS_CARD'
  | 'SUBSCRIPTION'
  | 'BOOST'
  | 'AD'
  | 'FEED'
  | 'TICKET'
  | 'SECURITY';

const LABELS: Record<Category, { title: string; hint: string }> = {
  NEW_USER: { title: 'ثبت‌نام کاربر جدید', hint: 'وقتی کاربر تازه‌ای عضو می‌شود' },
  BIOLINK: { title: 'بیولینک‌ها', hint: 'ساخت یا ویرایش بیولینک در انتظار تأیید' },
  BUSINESS_CARD: {
    title: 'کارت‌های ویزیت',
    hint: 'ساخت یا ویرایش کارت ویزیت در انتظار تأیید',
  },
  SUBSCRIPTION: { title: 'اشتراک‌ها', hint: 'درخواست اشتراک جدید' },
  BOOST: { title: 'افزایش بازدید', hint: 'درخواست پله جدید' },
  AD: { title: 'تبلیغات', hint: 'درخواست تبلیغ صفحه اصلی' },
  FEED: { title: 'فیدها', hint: 'پست فید یا اشتراک فید جدید در انتظار تأیید' },
  TICKET: { title: 'تیکت‌ها', hint: 'تیکت جدید یا پاسخ کاربر' },
  SECURITY: {
    title: 'رویدادهای امنیتی',
    hint: 'تغییر شماره موبایل یا ایمیل حساب کاربران',
  },
};

const ORDER: Category[] = [
  'NEW_USER',
  'BIOLINK',
  'BUSINESS_CARD',
  'SUBSCRIPTION',
  'BOOST',
  'AD',
  'FEED',
  'TICKET',
  'SECURITY',
];

interface SettingsPayload {
  adminNotifications: Record<Category, boolean>;
}

/**
 * Per-category switches for admin-facing notifications. When a category is off
 * the API never writes a notification row for it, which keeps the bell (and the
 * notifications table) quiet when the platform grows to thousands of users.
 */
export function AdminNotificationSettings() {
  const [prefs, setPrefs] = useState<Record<Category, boolean> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setPrefs(result.adminNotifications);
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

  async function save() {
    if (!prefs) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        adminNotifications: prefs,
      });
      setPrefs(result.adminNotifications);
      setMessage('تنظیمات اعلان‌ها ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex items-center gap-2">
        <BellRing className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">اعلان‌های پنل مدیریت</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        هر بخشی را که لازم نیست خاموش کنید؛ در آن صورت برای آن رویداد هیچ اعلانی ساخته
        نمی‌شود و زنگوله‌ی مدیریت شلوغ نخواهد شد.
      </p>

      {!prefs ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col divide-y divide-dashed divide-[var(--vintage-border)]">
            {ORDER.map((category) => {
              const enabled = prefs[category];
              return (
                <label
                  key={category}
                  className="flex cursor-pointer items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">
                      {LABELS[category].title}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {LABELS[category].hint}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggle(category)}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                      enabled
                        ? 'border-brand bg-brand'
                        : 'border-[var(--vintage-border)] bg-white'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all ${
                        enabled ? 'start-0.5' : 'start-5.5'
                      }`}
                    />
                  </button>
                </label>
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
        <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
