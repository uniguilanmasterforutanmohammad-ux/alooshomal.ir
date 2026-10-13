'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, Smartphone } from 'lucide-react';

import { api } from '@/lib/api';

interface SettingsPayload {
  phoneLoginEnabled: boolean;
}

/**
 * Sign-in / sign-up methods. Currently only phone + OTP is toggleable; email
 * and password always stay on. When phone login is off the API rejects both
 * `/auth/phone/*` endpoints, so the mobile tab simply stops working.
 */
export function AdminAuthSettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setEnabled(result.phoneLoginEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: boolean) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        phoneLoginEnabled: next,
      });
      setEnabled(result.phoneLoginEnabled);
      setMessage('تنظیمات ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="indeed-panel p-5">
      <div className="flex items-center gap-2">
        <Smartphone className="size-5 text-brand" aria-hidden />
        <h3 className="font-extrabold text-ink">روش‌های ورود و ثبت‌نام</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        ورود با ایمیل و رمز عبور همیشه فعال است. می‌توانید روش‌های دیگر را روشن یا خاموش کنید.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-start gap-3 rounded-lg border border-[var(--vintage-border)] p-3">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={enabled}
              disabled={busy}
              onChange={(event) => void save(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-bold text-ink">
                ورود و ثبت‌نام با موبایل و کد یکبار مصرف
              </span>
              <span className="block text-xs text-muted">
                اگر خاموش باشد، تب «موبایل و کد» در صفحه‌ی ورود کار نمی‌کند.
              </span>
            </span>
          </label>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <Save className="size-4" aria-hidden />
          {message}
        </p>
      ) : null}
    </section>
  );
}
