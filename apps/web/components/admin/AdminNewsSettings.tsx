'use client';

import { useCallback, useEffect, useState } from 'react';
import { Newspaper, Save } from 'lucide-react';

import { api } from '@/lib/api';

type NewsAccessLevel = 'REPORTERS_ONLY' | 'ANY_ACTIVE_USER' | 'ADMINS_ONLY';

interface SettingsPayload {
  newsHeadlineCount: number;
  newsAccessLevel: NewsAccessLevel;
}

const ACCESS_LABELS: Record<NewsAccessLevel, string> = {
  REPORTERS_ONLY: 'فقط شهروند خبرنگارهای تأییدشده',
  ANY_ACTIVE_USER: 'همه کاربران فعال',
  ADMINS_ONLY: 'فقط مدیران',
};

/**
 * «شهروند خبرنگار» settings: how many headlines the home page shows and who
 * is allowed to file news once the access level is enforced in the API.
 */
export function AdminNewsSettings() {
  const [count, setCount] = useState('');
  const [level, setLevel] = useState<NewsAccessLevel>('REPORTERS_ONLY');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setCount(String(result.newsHeadlineCount));
      setLevel(result.newsAccessLevel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(count);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      setError('تعداد تیتر باید بین ۱ تا ۵۰ باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        newsHeadlineCount: parsed,
        newsAccessLevel: level,
      });
      setCount(String(result.newsHeadlineCount));
      setLevel(result.newsAccessLevel);
      setMessage('تنظیمات شهروند خبرنگار ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <Newspaper className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">شهروند خبرنگار</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        تعداد تیترهای نمایش‌داده‌شده در جدول خبری صفحه اصلی و سطح دسترسی ثبت خبر.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد تیتر خبری در صفحه اصلی
            <input
              type="number"
              min={1}
              max={50}
              dir="ltr"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            سطح دسترسی ثبت خبر
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as NewsAccessLevel)}
              className="min-w-56 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            >
              {Object.entries(ACCESS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
        </form>
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
