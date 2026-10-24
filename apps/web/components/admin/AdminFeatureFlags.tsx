'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, ToggleRight } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/** One switch as declared by the API's `FEATURE_FLAGS` registry. */
interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  group: string;
  default: boolean;
}

interface SettingsPayload {
  features: Record<string, boolean>;
  featureFlags: FeatureFlag[];
}

/**
 * «ویژگی‌ها و دسترسی‌ها» — the single admin switchboard for every user-facing
 * capability. The list is driven by the API's `FEATURE_FLAGS` registry, so a
 * newly added feature shows up here automatically (permanent rule in
 * `AGENTS.md`, «قانون ۹»). Support tickets and contact/support channels are
 * deliberately exempt and always stay on.
 */
export function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setFlags(result.featureFlags ?? []);
      setValues(result.features ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری ویژگی‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: string, next: boolean) {
    const previous = values[key];
    setValues((prev) => ({ ...prev, [key]: next }));
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<{ features: Record<string, boolean> }>(
        '/admin/settings',
        { features: { [key]: next } },
      );
      setValues(result.features ?? {});
      setMessage('وضعیت ویژگی ذخیره شد.');
    } catch (err) {
      setValues((prev) => ({ ...prev, [key]: previous }));
      setError(err instanceof Error ? err.message : 'ذخیره وضعیت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  // Preserve the registry order and split into its declared groups.
  const groups: Array<{ name: string; items: FeatureFlag[] }> = [];
  for (const flag of flags) {
    const group = groups.find((entry) => entry.name === flag.group);
    if (group) group.items.push(flag);
    else groups.push({ name: flag.group, items: [flag] });
  }

  return (
    <section className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <ToggleRight className="size-5 text-brand" aria-hidden />
        <h3 className="font-extrabold text-ink">ویژگی‌ها و دسترسی‌ها</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        تمام قابلیت‌های کاربران از همین‌جا روشن یا خاموش می‌شوند. تیکت پشتیبانی و
        راه‌های تماس با ادمین همیشه فعال می‌مانند.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : flags.length === 0 ? (
        <p className="mt-4 text-sm text-muted">ویژگی‌ای ثبت نشده است.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.name}>
              <h4 className="mb-1 text-xs font-extrabold text-muted">{group.name}</h4>
              <div className="flex flex-col divide-y divide-dashed divide-[var(--vintage-border)]">
                {group.items.map((flag) => {
                  const enabled = values[flag.key] !== false;
                  return (
                    <label
                      key={flag.key}
                      className="flex cursor-pointer items-start justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink">
                          {flag.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {flag.description}
                        </span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={flag.label}
                        onClick={() => void toggle(flag.key, !enabled)}
                        disabled={busy}
                        className={cn(
                          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-60',
                          enabled
                            ? 'border-brand bg-brand'
                            : 'border-[var(--vintage-border)] bg-white',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all',
                            enabled ? 'start-0.5' : 'start-5.5',
                          )}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
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
