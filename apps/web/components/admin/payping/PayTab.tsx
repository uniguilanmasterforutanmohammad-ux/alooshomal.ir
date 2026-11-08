'use client';

import { useState } from 'react';
import {
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, cell, errorText, Panel, Banner, Field } from './shared';
import type { Row } from './shared';

const EMPTY_PAY = {
  amount: '',
  returnUrl: '',
  payerName: '',
  payerIdentity: '',
  description: '',
  clientRefId: '',
};

export function PayTab() {
  const [form, setForm] = useState({ ...EMPTY_PAY });
  const [result, setResult] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 1000) {
      setError('مبلغ باید عددی بزرگ‌تر از ۱۰۰۰ تومان باشد.');
      return;
    }
    if (!form.returnUrl.trim()) {
      setError('آدرس بازگشت الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.post<Row>('/admin/payping/payments', {
        amount,
        returnUrl: form.returnUrl,
        ...(form.payerName ? { payerName: form.payerName } : {}),
        ...(form.payerIdentity ? { payerIdentity: form.payerIdentity } : {}),
        ...(form.description ? { description: form.description } : {}),
        ...(form.clientRefId ? { clientRefId: form.clientRefId } : {}),
      });
      setResult(created);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const gatewayUrl =
    result && typeof result.url === 'string' ? result.url : null;

  return (
    <div className="flex flex-col gap-5">
      <Panel title="ساخت پرداخت">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="مبلغ (تومان)">
            <input
              type="number"
              min={1000}
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="آدرس بازگشت">
            <input
              value={form.returnUrl}
              onChange={(event) =>
                setForm({ ...form, returnUrl: event.target.value })
              }
              className={INPUT}
              dir="ltr"
              placeholder="https://shomalicard.ir/payments/callback"
            />
          </Field>
          <Field label="شناسه ارجاع پذیرنده">
            <input
              value={form.clientRefId}
              onChange={(event) =>
                setForm({ ...form, clientRefId: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="نام پرداخت‌کننده">
            <input
              value={form.payerName}
              onChange={(event) =>
                setForm({ ...form, payerName: event.target.value })
              }
              className={INPUT}
            />
          </Field>
          <Field label="موبایل/ایمیل پرداخت‌کننده">
            <input
              value={form.payerIdentity}
              onChange={(event) =>
                setForm({ ...form, payerIdentity: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="توضیحات">
            <input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <CreditCard className="size-4" aria-hidden />
          ساخت پرداخت
        </button>
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {result ? (
        <Panel title="نتیجه‌ی پرداخت">
          <p className="text-sm text-ink">
            کد پرداخت: <span dir="ltr">{cell(result, 'paymentCode')}</span>
          </p>
          {gatewayUrl ? (
            <p className="mt-2 text-sm">
              <a
                href={gatewayUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand underline"
              >
                انتقال به درگاه پرداخت
              </a>
            </p>
          ) : null}
          <pre
            dir="ltr"
            className="mt-3 max-h-64 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}
