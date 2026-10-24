'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, LayoutTemplate, Save, Sun, Moon } from 'lucide-react';

import { api } from '@/lib/api';
import { BIOLINK_TEMPLATES } from '@/lib/biolink-templates';
import { cn } from '@/lib/utils';

interface SettingsPayload {
  biolinkTemplatesEnabled: string[];
  biolinkTemplateDefaultLight: string;
  biolinkTemplateDefaultDark: string;
}

/**
 * «حالت‌های نمایش بیولینک» — the admin picks which of the ready-made biolink
 * display designs are offered, and which one is the default for light-mode and
 * dark-mode pages. Visitors may switch between the enabled designs on a biolink
 * page; owners pick a light + dark design while building.
 */
export function AdminBiolinkTemplates() {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [defaultLight, setDefaultLight] = useState('');
  const [defaultDark, setDefaultDark] = useState('');
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
      setDefaultLight(result.biolinkTemplateDefaultLight ?? '');
      setDefaultDark(result.biolinkTemplateDefaultDark ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: {
    enabled?: string[];
    defaultLight?: string;
    defaultDark?: string;
  }) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        biolinkTemplatesEnabled: next.enabled ?? enabled,
        biolinkTemplateDefaultLight: next.defaultLight ?? defaultLight,
        biolinkTemplateDefaultDark: next.defaultDark ?? defaultDark,
      });
      setEnabled(result.biolinkTemplatesEnabled ?? []);
      setDefaultLight(result.biolinkTemplateDefaultLight ?? '');
      setDefaultDark(result.biolinkTemplateDefaultDark ?? '');
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
    // Keep the registry order so the stored value stays stable.
    const ordered = BIOLINK_TEMPLATES.map((t) => t.key).filter((k) => next.includes(k));
    setEnabled(ordered);
    // If the current default just got disabled, fall back to the first light /
    // dark design that is still enabled.
    const lightFallback = BIOLINK_TEMPLATES.find(
      (t) => ordered.includes(t.key) && !t.dark,
    )?.key;
    const darkFallback = BIOLINK_TEMPLATES.find(
      (t) => ordered.includes(t.key) && t.dark,
    )?.key;
    const payload: { enabled: string[]; defaultLight?: string; defaultDark?: string } = {
      enabled: ordered,
    };
    if (!ordered.includes(defaultLight) && lightFallback) payload.defaultLight = lightFallback;
    if (!ordered.includes(defaultDark) && darkFallback) payload.defaultDark = darkFallback;
    if (payload.defaultLight) setDefaultLight(payload.defaultLight);
    if (payload.defaultDark) setDefaultDark(payload.defaultDark);
    void persist(payload);
  }

  const lightOptions = BIOLINK_TEMPLATES.filter((t) => enabled.includes(t.key));

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
        طرح‌های آماده‌ی نمایش بیولینک را فعال یا غیرفعال کنید و مشخص کنید کدام طرح
        به‌صورت پیش‌فرض برای «تم روشن» و «تم تاریک» سایت استفاده شود. بازدیدکننده‌ها
        می‌توانند بین طرح‌های فعال‌شده جابه‌جا شوند و کاربر هنگام ساخت، طرح روشن و
        تاریک خود را انتخاب می‌کند.
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <Sun className="size-3.5" aria-hidden />
            پیش‌فرض تم روشن
          </span>
          <select
            className="indeed-input"
            value={defaultLight}
            disabled={busy}
            onChange={(event) => {
              const key = event.target.value;
              setDefaultLight(key);
              void persist({ defaultLight: key });
            }}
          >
            {lightOptions.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <Moon className="size-3.5" aria-hidden />
            پیش‌فرض تم تاریک
          </span>
          <select
            className="indeed-input"
            value={defaultDark}
            disabled={busy}
            onChange={(event) => {
              const key = event.target.value;
              setDefaultDark(key);
              void persist({ defaultDark: key });
            }}
          >
            {lightOptions.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
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
