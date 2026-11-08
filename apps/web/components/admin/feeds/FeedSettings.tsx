'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';

export function FeedSettings() {
  const [maxImages, setMaxImages] = useState('');
  const [maxKb, setMaxKb] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<{ feedMaxImages: number; feedMaxImageKb: number }>(
        '/admin/settings',
      );
      setMaxImages(String(result.feedMaxImages));
      setMaxKb(String(result.feedMaxImageKb));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const images = Number(maxImages);
    const kb = Number(maxKb);
    if (!Number.isInteger(images) || images < 1 || images > 20) {
      setError('تعداد تصویر مجاز باید بین ۱ تا ۲۰ باشد');
      return;
    }
    if (!Number.isInteger(kb) || kb < 64 || kb > 20480) {
      setError('حجم تصویر باید بین ۶۴ تا ۲۰۴۸۰ کیلوبایت باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<{ feedMaxImages: number; feedMaxImageKb: number }>(
        '/admin/settings',
        { feedMaxImages: images, feedMaxImageKb: kb },
      );
      setMaxImages(String(result.feedMaxImages));
      setMaxKb(String(result.feedMaxImageKb));
      setMessage('تنظیمات فید ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Layers className="size-5 text-brand" aria-hidden />
        محدودیت رسانه فید
      </h3>
      <p className="mt-1 text-xs text-muted">
        حداکثر تعداد تصویر مجاز برای هر پست و حداکثر حجم هر تصویر.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            حداکثر تعداد تصویر
            <input
              type="number"
              min={1}
              max={20}
              dir="ltr"
              value={maxImages}
              onChange={(event) => setMaxImages(event.target.value)}
              className="w-40 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            حداکثر حجم تصویر (کیلوبایت)
            <input
              type="number"
              min={64}
              max={20480}
              dir="ltr"
              value={maxKb}
              onChange={(event) => setMaxKb(event.target.value)}
              className="w-44 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
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
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      )}
    </div>
  );
}

/**
 * «کامنت‌ها» — moderation queue for user comments on feed posts. Comments only
 * become public after an admin approves them, so the default filter is the
 * pending queue; approved/rejected tabs let an admin revisit past decisions.
 */
