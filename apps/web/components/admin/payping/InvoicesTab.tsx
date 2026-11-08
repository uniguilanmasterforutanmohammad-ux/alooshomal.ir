'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, DataTable, Field } from './shared';
import type { Row } from './shared';

const EMPTY_INVOICE = { title: '', number: '', createStatus: '0' };

export function InvoicesTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_INVOICE });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/invoices?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/payping/invoices', {
        ...(form.title ? { title: form.title } : {}),
        ...(form.number ? { number: form.number } : {}),
        createStatus: Number(form.createStatus),
        products: [],
        customers: [],
      });
      setForm({ ...EMPTY_INVOICE });
      setNotice('فاکتور ساخته شد.');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function archive(code: string, archived: boolean) {
    setError(null);
    try {
      await api.post(
        `/admin/payping/invoices/${encodeURIComponent(code)}/${
          archived ? 'archive' : 'dearchive'
        }`,
      );
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function pdf(code: string) {
    setError(null);
    try {
      const result = await api.get<Row>(
        `/admin/payping/invoices/${encodeURIComponent(code)}/pdf`,
      );
      setNotice(`PDF: ${JSON.stringify(result)}`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="فاکتور جدید">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="عنوان فاکتور">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="شماره فاکتور">
            <input
              value={form.number}
              onChange={(event) => setForm({ ...form, number: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="وضعیت ثبت">
            <select
              value={form.createStatus}
              onChange={(event) =>
                setForm({ ...form, createStatus: event.target.value })
              }
              className={INPUT}
            >
              <option value="0">پیش‌نویس</option>
              <option value="1">ارسال</option>
              <option value="2">پرداخت‌شده</option>
            </select>
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          ساخت فاکتور
        </button>
        {notice ? (
          <div className="mt-3">
            <Banner kind="ok">{notice}</Banner>
          </div>
        ) : null}
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="فاکتورها"
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
            { key: 'number', label: 'شماره' },
            { key: 'title', label: 'عنوان' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'status', label: 'وضعیت' },
            { key: 'createdDate', label: 'تاریخ' },
          ]}
          empty="فاکتوری ثبت نشده است."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <span key={`${code}-${index}`} className="inline-flex gap-1">
                  <button
                    onClick={() => void archive(code, true)}
                    className="indeed-btn indeed-btn-secondary py-1 text-xs"
                  >
                    بایگانی {code}
                  </button>
                  <button
                    onClick={() => void pdf(code)}
                    className="indeed-btn indeed-btn-secondary py-1 text-xs"
                  >
                    PDF
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
