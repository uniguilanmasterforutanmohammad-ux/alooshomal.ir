'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, DataTable, Field } from './shared';
import type { Row } from './shared';

export function WithdrawalsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.post<Row[]>(
        '/admin/payping/reports/withdrawals',
        {},
      );
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function request() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1000) {
      setError('مبلغ تسویه باید عددی بزرگ‌تر از ۱۰۰۰ تومان باشد.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/admin/payping/withdrawals', { amount: value });
      setMessage('درخواست تسویه ثبت شد.');
      setAmount('');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="درخواست تسویه‌حساب">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="مبلغ (تومان)">
            <input
              type="number"
              min={1000}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={INPUT}
            />
          </Field>
          <button
            onClick={() => void request()}
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden />
            ثبت درخواست
          </button>
        </div>
        {message ? (
          <div className="mt-3">
            <Banner kind="ok">{message}</Banner>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="تسویه‌حساب‌ها"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            { key: 'code', label: 'کد' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'status', label: 'وضعیت' },
            { key: 'createdDate', label: 'تاریخ' },
          ]}
          empty="تسویه‌ای ثبت نشده است."
        />
      </Panel>
    </div>
  );
}
