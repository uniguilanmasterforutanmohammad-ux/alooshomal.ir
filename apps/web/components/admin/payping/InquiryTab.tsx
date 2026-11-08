'use client';

import { useState } from 'react';
import {
  ShieldQuestion,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, Field } from './shared';

const INQUIRIES: Array<{
  key: string;
  label: string;
  params: Array<{ name: string; label: string }>;
}> = [
  {
    key: 'card-to-sheba',
    label: 'تبدیل کارت به شبا',
    params: [{ name: 'cardNumber', label: 'شماره کارت' }],
  },
  {
    key: 'card-to-deposit',
    label: 'تبدیل کارت به حساب',
    params: [{ name: 'cardNumber', label: 'شماره کارت' }],
  },
  {
    key: 'card-to-owner',
    label: 'استعلام کارت',
    params: [{ name: 'cardNumber', label: 'شماره کارت' }],
  },
  {
    key: 'sheba-owner',
    label: 'استعلام شبا',
    params: [{ name: 'sheba', label: 'شبا' }],
  },
  {
    key: 'postal-code',
    label: 'استعلام کدپستی',
    params: [{ name: 'postalCode', label: 'کدپستی' }],
  },
  {
    key: 'national-code',
    label: 'استعلام اطلاعات هویتی',
    params: [
      { name: 'nationalCode', label: 'کد ملی' },
      { name: 'birthDate', label: 'تاریخ تولد' },
    ],
  },
  {
    key: 'national-code-mobile',
    label: 'تطابق کد ملی و موبایل',
    params: [
      { name: 'nationalCode', label: 'کد ملی' },
      { name: 'mobile', label: 'موبایل' },
    ],
  },
];

export function InquiryTab() {
  const [selected, setSelected] = useState(INQUIRIES[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const query = new URLSearchParams();
    for (const param of selected.params) {
      const value = values[param.name];
      if (value) query.set(param.name, value);
    }
    try {
      setResult(
        await api.get<unknown>(
          `/admin/payping/inquiries/${selected.key}?${query.toString()}`,
        ),
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Banner kind="info">
        سرویس‌های استعلامی به‌صورت پیش‌فرض در توکن فعال نیستند و ممکن است خطای
        دسترسی برگردانند؛ در صورت نیاز آن‌ها را در کنسول پی‌پینگ فعال کنید.
      </Banner>

      <Panel title="استعلام">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="نوع استعلام">
            <select
              value={selected.key}
              onChange={(event) => {
                const next = INQUIRIES.find(
                  (item) => item.key === event.target.value,
                );
                if (next) {
                  setSelected(next);
                  setValues({});
                }
              }}
              className={INPUT}
            >
              {INQUIRIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          {selected.params.map((param) => (
            <Field key={param.name} label={param.label}>
              <input
                value={values[param.name] ?? ''}
                onChange={(event) =>
                  setValues({ ...values, [param.name]: event.target.value })
                }
                className={INPUT}
                dir="ltr"
              />
            </Field>
          ))}
        </div>
        <button
          onClick={() => void run()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <ShieldQuestion className="size-4" aria-hidden />
          استعلام
        </button>
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {result ? (
        <Panel title="نتیجه">
          <pre
            dir="ltr"
            className="max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}
