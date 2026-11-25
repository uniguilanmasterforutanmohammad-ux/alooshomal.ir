'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';

import { api, type AccommodationAiImportSettings } from '@/lib/api';
import { toast } from '@/lib/toast';

const field =
  'mt-1 w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1.5 text-sm text-ink';

/** Admin pricing of the «ورود خودکار اقامتگاه از جاباما» feature. */
export function AdminAccommodationSettings() {
  const [settings, setSettings] = useState<AccommodationAiImportSettings>({
    pricePer1k: 1500,
    minPrice: 5000,
    minImages: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(
        await api.get<AccommodationAiImportSettings>(
          '/admin/accommodations/settings',
        ),
      );
    } catch {
      // API client already surfaced the error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const next = await api.patch<AccommodationAiImportSettings>(
        '/admin/accommodations/settings',
        {
          aiPricePer1k: settings.pricePer1k,
          aiMinPrice: settings.minPrice,
          aiMinImages: settings.minImages,
        },
      );
      setSettings(next);
      toast.success('تنظیمات ماژول اقامتگاه ذخیره شد');
    } catch {
      // API client already surfaced the error
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="indeed-panel p-5">
      <h4 className="text-sm font-extrabold text-ink">
        تعرفه‌ی ورود خودکار اقامتگاه از جاباما
      </h4>
      <p className="mt-0.5 text-xs leading-6 text-muted">
        هزینه‌ی ایمپورت بر اساس توکن مصرفی هوش مصنوعی محاسبه می‌شود.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-muted">در حال بارگذاری…</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-[11px] font-bold text-muted">
            هزینه‌ی هر ۱۰۰۰ توکن (تومان)
            <input
              type="number"
              min={0}
              value={settings.pricePer1k}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  pricePer1k: Number(event.target.value) || 0,
                }))
              }
              className={field}
            />
          </label>
          <label className="text-[11px] font-bold text-muted">
            حداقل هزینه‌ی هر ایمپورت (تومان)
            <input
              type="number"
              min={0}
              value={settings.minPrice}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  minPrice: Number(event.target.value) || 0,
                }))
              }
              className={field}
            />
          </label>
          <label className="text-[11px] font-bold text-muted">
            حداقل تعداد تصویر
            <input
              type="number"
              min={1}
              max={20}
              value={settings.minImages}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  minImages: Number(event.target.value) || 1,
                }))
              }
              className={field}
            />
          </label>
        </div>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || loading}
        className="indeed-btn indeed-btn-primary mt-3 py-1.5 text-xs disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Save className="size-3.5" aria-hidden />
        )}
        ذخیره
      </button>
    </section>
  );
}
