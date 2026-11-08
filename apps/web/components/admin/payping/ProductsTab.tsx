'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Link2,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, DataTable, Field } from './shared';
import type { Row } from './shared';

const EMPTY_PRODUCT = { title: '', amount: '', description: '' };

export function ProductsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [permalink, setPermalink] = useState({ productCode: '', permalink: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.get<Row[]>('/admin/payping/products?limit=50');
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.title.trim()) {
      setError('عنوان آیتم مالی الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/payping/products', {
        title: form.title,
        ...(form.amount ? { amount: Number(form.amount) } : {}),
        ...(form.description ? { description: form.description } : {}),
      });
      setForm({ ...EMPTY_PRODUCT });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function createPermalink() {
    if (!permalink.productCode.trim()) {
      setError('کد آیتم مالی الزامی است.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/admin/payping/permalinks', permalink);
      setNotice('لینک ثابت ساخته شد.');
      setPermalink({ productCode: '', permalink: '' });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Banner kind="info">
        سرویس‌های «آیتم مالی» و «لینک ثابت» در پی‌پینگ محدود به IP مجاز هستند؛
        اگر خطای «Client IP is not allowed» دیدید، IP سرور را در کنسول
        توسعه‌دهنده‌ی پی‌پینگ ثبت کنید.
      </Banner>

      <Panel title="آیتم مالی جدید">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="عنوان">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="مبلغ (تومان)">
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className={INPUT}
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
          ساخت آیتم مالی
        </button>
      </Panel>

      <Panel title="لینک ثابت (Permalink)">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="کد آیتم مالی">
            <input
              value={permalink.productCode}
              onChange={(event) =>
                setPermalink({ ...permalink, productCode: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
          <Field label="لینک ثابت دلخواه (اختیاری)">
            <input
              value={permalink.permalink}
              onChange={(event) =>
                setPermalink({ ...permalink, permalink: event.target.value })
              }
              className={INPUT}
              dir="ltr"
            />
          </Field>
        </div>
        <button
          onClick={() => void createPermalink()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <Link2 className="size-4" aria-hidden />
          ساخت لینک ثابت
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
        title="آیتم‌های مالی"
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
            { key: 'title', label: 'عنوان' },
            { key: 'code', label: 'کد' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'quantity', label: 'موجودی' },
          ]}
          empty="آیتم مالی‌ای ثبت نشده است."
        />
      </Panel>
    </div>
  );
}
