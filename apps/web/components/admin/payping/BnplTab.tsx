'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cell, errorText, Panel, Banner, DataTable } from './shared';
import type { Row } from './shared';

export function BnplTab() {
  const [options, setOptions] = useState<Row | null>(null);
  const [orders, setOrders] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const [opt, orderList, planList] = await Promise.all([
        api.get<Row>('/admin/payping/bnpl/options').catch(() => null),
        api
          .get<{ orders?: Row[] }>('/admin/payping/bnpl/orders')
          .catch(() => ({ orders: [] })),
        api
          .get<{ plansInfo?: Row[] }>('/admin/payping/bnpl/plans')
          .catch(() => ({ plansInfo: [] })),
      ]);
      setOptions(opt);
      setOrders(Array.isArray(orderList?.orders) ? orderList.orders : []);
      setPlans(Array.isArray(planList?.plansInfo) ? planList.plansInfo : []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(planCode: string, isActive: boolean) {
    setError(null);
    try {
      await api.put('/admin/payping/bnpl/plans/toggle', { planCode, isActive });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Banner kind="error">{error}</Banner> : null}

      <Panel
        title="گزینه‌های خرید اقساطی"
        action={
          <button
            onClick={() => void load()}
            disabled={busy}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs disabled:opacity-60"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            بارگذاری
          </button>
        }
      >
        {options ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">شناسه قرارداد</p>
              <p className="text-sm font-bold text-ink">
                {cell(options, 'contractId')}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">اعتبارها</p>
              <p className="text-sm font-bold text-ink">
                {Array.isArray(options.credits) ? options.credits.length : 0}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">ضامن‌ها</p>
              <p className="text-sm font-bold text-ink">
                {Array.isArray(options.guarantors)
                  ? options.guarantors.length
                  : 0}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">گزینه‌ای دریافت نشد.</p>
        )}
      </Panel>

      <Panel title="طرح‌های اقساطی">
        <DataTable
          rows={plans}
          columns={[
            { key: 'name', label: 'نام طرح' },
            { key: 'code', label: 'کد' },
            { key: 'isActive', label: 'فعال' },
          ]}
          empty="طرح اقساطی‌ای تعریف نشده است."
        />
        {plans.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {plans.map((row, index) => {
              const code = String(row.code ?? '');
              if (!code) return null;
              const active = Boolean(row.isActive);
              return (
                <button
                  key={`${code}-${index}`}
                  onClick={() => void toggle(code, !active)}
                  className="indeed-btn indeed-btn-secondary py-1 text-xs"
                >
                  {active ? 'غیرفعال‌کردن' : 'فعال‌کردن'} {code}
                </button>
              );
            })}
          </div>
        ) : null}
      </Panel>

      <Panel title="سفارش‌های اقساطی">
        <DataTable
          rows={orders}
          columns={[
            { key: 'trackingCode', label: 'کد رهگیری' },
            { key: 'consumerName', label: 'خریدار' },
            { key: 'amount', label: 'مبلغ', money: true },
            { key: 'orderStatus', label: 'وضعیت' },
            { key: 'createdDate', label: 'تاریخ' },
          ]}
          empty="سفارش اقساطی‌ای ثبت نشده است."
        />
      </Panel>
    </div>
  );
}
