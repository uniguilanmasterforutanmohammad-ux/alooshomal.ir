'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, Save } from 'lucide-react';

import { api } from '@/lib/api';

interface SettingsPayload {
  directoryPageSize: number;
  adminListPageSize: number;
  myListPageSize: number;
}

/**
 * Lets the admin control how many cards each directory page shows. The value is
 * persisted in the `Setting` table and consumed by the public directory
 * endpoints, which fetch only that many rows per page (server-side pagination).
 */
export function AdminDirectorySettings() {
  const [value, setValue] = useState('');
  const [adminValue, setAdminValue] = useState('');
  const [myValue, setMyValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setValue(String(result.directoryPageSize));
      setAdminValue(String(result.adminListPageSize));
      setMyValue(String(result.myListPageSize));
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
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      setError('عدد باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    const parsedAdmin = Number(adminValue);
    if (!Number.isInteger(parsedAdmin) || parsedAdmin < 1 || parsedAdmin > 100) {
      setError('عدد باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    const parsedMy = Number(myValue);
    if (!Number.isInteger(parsedMy) || parsedMy < 1 || parsedMy > 100) {
      setError('عدد باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        directoryPageSize: parsed,
        adminListPageSize: parsedAdmin,
        myListPageSize: parsedMy,
      });
      setValue(String(result.directoryPageSize));
      setAdminValue(String(result.adminListPageSize));
      setMyValue(String(result.myListPageSize));
      setMessage('تنظیمات ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <LayoutGrid className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">نمایش دایرکتوری</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        تعداد کارت‌ها و بیولینک‌های نمایش‌داده‌شده در هر صفحه از دایرکتوری‌های عمومی،
        فهرست‌های پنل مدیریت و فهرست‌های «کارت‌های من / ذخیره‌شده‌ها / افزایش بازدید».
        فقط همین تعداد از سرور خوانده می‌شود تا صفحات سریع بمانند.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد هر صفحه دایرکتوری
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد هر صفحه پنل مدیریت
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              value={adminValue}
              onChange={(event) => setAdminValue(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد هر صفحه «کارت‌های من»
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              value={myValue}
              onChange={(event) => setMyValue(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
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
