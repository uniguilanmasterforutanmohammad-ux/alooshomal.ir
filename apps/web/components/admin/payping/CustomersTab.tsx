'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, DataTable, Field } from './shared';
import type { Row } from './shared';

const EMPTY_CUSTOMER = { firstName: '', lastName: '', phone: '', email: '' };

export function CustomersTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_CUSTOMER });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/customers?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('نام و نام خانوادگی الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/payping/customers', form);
      setForm({ ...EMPTY_CUSTOMER });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(code: string) {
    setError(null);
    try {
      await api.delete(`/admin/payping/customers/${encodeURIComponent(code)}`);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="مشتری جدید">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="نام">
            <input
              value={form.firstName}
              onChange={(event) =>
                setForm({ ...form, firstName: event.target.value })
              }
              className={INPUT}
            />
          </Field>
          <Field label="نام خانوادگی">
            <input
              value={form.lastName}
              onChange={(event) =>
                setForm({ ...form, lastName: event.target.value })
              }
              className={INPUT}
            />
          </Field>
          <Field label="موبایل">
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="ایمیل">
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          افزودن مشتری
        </button>
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="لیست مشتریان"
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
            { key: 'firstName', label: 'نام' },
            { key: 'lastName', label: 'نام خانوادگی' },
            { key: 'phone', label: 'موبایل' },
            { key: 'email', label: 'ایمیل' },
            { key: 'code', label: 'کد' },
          ]}
          empty="مشتری‌ای ثبت نشده است."
        />
        {rows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void remove(code)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف {code}
                </button>
              );
            })}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
