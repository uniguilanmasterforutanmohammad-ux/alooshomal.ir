'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, LayoutTemplate, Save } from 'lucide-react';

import { api } from '@/lib/api';
import { BIOLINK_TEMPLATES } from '@/lib/biolink-templates';
import { cn } from '@/lib/utils';

interface SettingsPayload {
  biolinkTemplatesEnabled: string[];
}

/**
 * «حالت‌های نمایش بیولینک» — the admin picks which of the ready-made biolink
 * designs are offered to owners. The classic «رکورد» look is always available
 * and is not listed here. There is no per-site default: each owner chooses their
 * own display mode while building, and visitors may switch between the classic
 * look and the owner's chosen design.
 */
export function AdminBiolinkTemplates() {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setEnabled(result.biolinkTemplatesEnabled ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: string[]) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        biolinkTemplatesEnabled: next,
      });
      setEnabled(result.biolinkTemplatesEnabled ?? []);
      setMessage('تنظیمات حالت‌های نمایش ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: string) {
    const next = enabled.includes(key)
      ? enabled.filter((entry) => entry !== key)
      : [...enabled, key];
    if (next.length === 0) {
      setError('حداقل یک حالت نمایش باید فعال بماند.');
      return;
    }
    const ordered = BIOLINK_TEMPLATES.map((t) => t.key).filter((k) => next.includes(k));
    setEnabled(ordered);
    void persist(ordered);
  }

  if (loading) {
    return (
      <section className="indeed-panel p-5 lg:col-span-2">
        <p className="text-sm text-muted">در حال بارگذاری حالت‌های نمایش...</p>
      </section>
    );
  }

  return (
    <section className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="size-5 text-brand" aria-hidden />
        <h3 className="font-extrabold text-ink">حالت‌های نمایش بیولینک</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        طرح‌های آماده‌ی نمایش بیولینک را فعال یا غیرفعال کنید. حالت «کلاسیک (رکورد)»
        همیشه در دسترس است و کاربر هنگام ساخت، یکی از طرح‌های فعال را انتخاب می‌کند؛
        بازدیدکننده می‌تواند بین حالت کلاسیک و طرح انتخابی کاربر جابه‌جا شود.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {BIOLINK_TEMPLATES.map((template) => {
          const isOn = enabled.includes(template.key);
          return (
            <button
              key={template.key}
              type="button"
              disabled={busy}
              onClick={() => toggle(template.key)}
              aria-pressed={isOn}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-2 text-start transition disabled:opacity-60',
                isOn
                  ? 'border-brand bg-brand/5'
                  : 'border-[var(--vintage-border)] bg-white',
              )}
            >
              <span
                className="size-9 shrink-0 rounded-md border border-[var(--vintage-border)]"
                style={{
                  background: `linear-gradient(135deg, ${template.swatch[0]} 0 34%, ${template.swatch[1]} 34% 67%, ${template.swatch[2]} 67% 100%)`,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">
                  {template.name}
                </span>
                <span className="block text-[11px] text-muted">
                  {template.dark ? 'تاریک' : 'روشن'}
                </span>
              </span>
              {isOn ? <Check className="size-4 text-brand" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      {message ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <Save className="size-4" aria-hidden />
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
