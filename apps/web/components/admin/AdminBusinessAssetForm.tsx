'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Rules {
  lockedFields: string[];
  submitLabel: string;
  allowMobileChange: boolean;
  allowMobileAdd: boolean;
}

interface Payload {
  businessCard: Rules;
  biolink: Rules;
}

interface SettingsResponse {
  businessAssetForm?: Payload;
}

const LOCKABLE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'fullName', label: 'نام (به مدیریت)' },
  { key: 'businessId', label: 'انتخاب کسب‌وکار' },
  { key: 'cityId', label: 'انتخاب شهر' },
  { key: 'mobile', label: 'تلفن همراه' },
];

const DEFAULTS: Payload = {
  businessCard: {
    lockedFields: ['businessId', 'mobile'],
    submitLabel: 'پرداخت و ارسال برای تأیید',
    allowMobileChange: true,
    allowMobileAdd: true,
  },
  biolink: {
    lockedFields: ['businessId', 'mobile'],
    submitLabel: 'پرداخت و ارسال برای تأیید',
    allowMobileChange: true,
    allowMobileAdd: true,
  },
};

/**
 * «فرم ساخت کارت ویزیت و بیولینک» — the admin decides which identity fields
 * are prefilled and locked in the two builders, relabels the paid submit
 * button and turns the «تغییر/افزودن تلفن همراه» actions on or off.
 */
export function AdminBusinessAssetForm() {
  const [config, setConfig] = useState<Payload>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsResponse>('/admin/settings');
      if (result.businessAssetForm) {
        setConfig({
          businessCard: { ...DEFAULTS.businessCard, ...result.businessAssetForm.businessCard },
          biolink: { ...DEFAULTS.biolink, ...result.businessAssetForm.biolink },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update(kind: keyof Payload, patch: Partial<Rules>) {
    setConfig((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
    setMessage(null);
  }

  function toggleLock(kind: keyof Payload, field: string) {
    const current = config[kind].lockedFields;
    const next = current.includes(field)
      ? current.filter((entry) => entry !== field)
      : [...current, field];
    update(kind, { lockedFields: next });
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch('/admin/settings', { businessAssetForm: config });
      setMessage('تنظیمات فرم کارت ویزیت و بیولینک ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="indeed-panel p-5">
        <p className="text-sm text-muted">در حال بارگذاری تنظیمات فرم...</p>
      </section>
    );
  }

  return (
    <section className="indeed-panel p-5">
      <h2 className="text-lg font-extrabold text-ink">فرم ساخت کارت ویزیت و بیولینک</h2>
      <p className="mt-1 text-xs leading-6 text-muted">
        فیلدهایی که از استعلام‌های تأییدشده پر می‌شوند را می‌توانید قفل کنید تا
        کاربر نتواند تغییرشان دهد. برچسب دکمه‌ی پرداخت و دکمه‌های تلفن همراه هم
        از همین‌جا کنترل می‌شوند.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(['businessCard', 'biolink'] as const).map((kind) => (
          <div
            key={kind}
            className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4"
          >
            <h3 className="text-sm font-extrabold text-ink">
              {kind === 'businessCard' ? 'کارت ویزیت' : 'بیولینک'}
            </h3>

            <p className="mt-3 text-xs font-bold text-muted">فیلدهای قفل‌شده</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {LOCKABLE_FIELDS.map((field) => {
                const active = config[kind].lockedFields.includes(field.key);
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => toggleLock(kind, field.key)}
                    className={cn(
                      'rounded-lg border px-2 py-1.5 text-[11px] font-bold transition',
                      active
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-[var(--vintage-border)] text-muted hover:border-brand',
                    )}
                  >
                    {field.label}
                  </button>
                );
              })}
            </div>

            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-bold text-muted">برچسب دکمه‌ی ارسال</span>
              <input
                className="indeed-input"
                value={config[kind].submitLabel}
                maxLength={60}
                onChange={(event) => update(kind, { submitLabel: event.target.value })}
              />
            </label>

            <div className="mt-3 flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={config[kind].allowMobileChange}
                  onChange={(event) =>
                    update(kind, { allowMobileChange: event.target.checked })
                  }
                />
                امکان «تغییر تلفن همراه»
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-ink">
                <input
                  type="checkbox"
                  checked={config[kind].allowMobileAdd}
                  onChange={(event) =>
                    update(kind, { allowMobileAdd: event.target.checked })
                  }
                />
                امکان «افزودن تلفن همراه»
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="indeed-btn indeed-btn-primary mt-4 py-2 text-xs"
      >
        <Save className="size-4" aria-hidden />
        {busy ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
      </button>
    </section>
  );
}
