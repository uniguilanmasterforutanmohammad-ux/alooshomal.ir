'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, DataTable, Field } from './shared';
import type { Row } from './shared';

const EMPTY_COUPON = { name: '', code: '', type: '0', amount: '' };

export function CouponsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_COUPON });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/coupons?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.name.trim()) {
      setError('نام کد تخفیف الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/payping/coupons', {
        name: form.name,
        ...(form.code ? { code: form.code } : {}),
        type: Number(form.type),
        ...(form.amount ? { amount: Number(form.amount) } : {}),
      });
      setForm({ ...EMPTY_COUPON });
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
      await api.delete(`/admin/payping/coupons/${encodeURIComponent(code)}`);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="کد تخفیف جدید">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="نام">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="کد (اختیاری)">
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="نوع (۰ درصد / ۱ مبلغ)">
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              className={INPUT}
            >
              <option value="0">درصد</option>
              <option value="1">مبلغ ثابت</option>
            </select>
          </Field>
          <Field label="مقدار">
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void create()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          ساخت کد تخفیف
        </button>
        {error ? (
          <div className="mt-3">
            <Banner kind="error">{error}</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="کدهای تخفیف"
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
            { key: 'name', label: 'نام' },
            { key: 'code', label: 'کد' },
            { key: 'type', label: 'نوع' },
            { key: 'amount', label: 'مقدار' },
            { key: 'isActive', label: 'فعال' },
            { key: 'maxRedemption', label: 'حداکثر استفاده' },
          ]}
          empty="کد تخفیفی ثبت نشده است."
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
