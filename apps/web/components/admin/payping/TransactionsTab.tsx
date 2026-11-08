'use client';

import { useState } from 'react';
import {
  Loader2,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, DataTable, Field } from './shared';
import type { Row } from './shared';

export function TransactionsTab() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const body = () => ({
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  });

  async function load() {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const [list, total] = await Promise.all([
        api.post<Row[]>('/admin/payping/reports/transactions', body()),
        api.post<{ result?: number }>(
          '/admin/payping/reports/transactions/count',
          body(),
        ),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setCount(total?.result ?? null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(code: string) {
    setError(null);
    try {
      setDetail(
        await api.get<Row>(
          `/admin/payping/reports/transaction/${encodeURIComponent(code)}`,
        ),
      );
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="فیلتر گزارش تراکنش‌ها">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="از تاریخ">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="تا تاریخ">
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className={INPUT}
            />
          </Field>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Search className="size-4" aria-hidden />
            )}
            نمایش گزارش
          </button>
        </div>
        {count !== null ? (
          <p className="mt-3 text-xs text-muted">
            تعداد تراکنش‌ها: {count.toLocaleString('fa-IR')}
          </p>
        ) : null}
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      <Panel title="نتیجه‌ی گزارش">
        <DataTable
          rows={rows}
          columns={[
            { key: 'code', label: 'کد پرداخت' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'name', label: 'نام' },
            { key: 'payerIdentity', label: 'پرداخت‌کننده' },
            { key: 'isPaid', label: 'پرداخت‌شده' },
            { key: 'isRequest', label: 'نوع' },
            { key: 'payDate', label: 'تاریخ پرداخت' },
            { key: 'clientRefId', label: 'ارجاع پذیرنده' },
          ]}
          empty="تراکنشی در این بازه یافت نشد."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.slice(0, 8).map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void openDetail(code)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs"
                >
                  جزئیات {code}
                </button>
              );
            })}
          </div>
        ) : null}
        {detail ? (
          <pre
            dir="ltr"
            className="mt-4 max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(detail, null, 2)}
          </pre>
        ) : null}
      </Panel>
    </div>
  );
}
