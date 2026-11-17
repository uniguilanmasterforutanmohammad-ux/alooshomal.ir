'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type RetailOrder } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'CONFIRMED', label: 'تأییدشده' },
  { value: 'PAID', label: 'پرداخت‌شده' },
  { value: 'SHIPPED', label: 'ارسال‌شده' },
  { value: 'DELIVERED', label: 'تحویل‌شده' },
  { value: 'CANCELLED', label: 'لغوشده' },
];

const PAYMENT_STATUSES = [
  { value: 'UNPAID', label: 'پرداخت‌نشده' },
  { value: 'PENDING_REVIEW', label: 'در انتظار تأیید رسید' },
  { value: 'PAID', label: 'پرداخت‌شده' },
  { value: 'REFUNDED', label: 'بازگشت‌داده‌شده' },
];

const field =
  'rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-2 py-1 text-xs text-ink outline-none focus:border-brand';

export default function OrdersPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<RetailOrder[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter ? `?status=${filter}` : '';
      setItems(await api.get<RetailOrder[]>(`/retail/orders${query}`));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/orders');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function update(order: RetailOrder, patch: Record<string, string>) {
    await api.patch(`/retail/orders/${order.id}`, patch);
    await load();
    toast.success('سفارش به‌روزرسانی شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">سفارش‌ها</h1>
        <p className="mt-1 text-sm text-muted">
          سفارش‌های ثبت‌شده از ویترین عمومی فروشگاه؛ وضعیت آماده‌سازی و پرداخت را
          اینجا مدیریت کنید.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter('')} className={cn('indeed-btn py-1 text-xs', filter === '' && 'indeed-btn-primary')}>
          همه
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => setFilter(status.value)}
            className={cn('indeed-btn py-1 text-xs', filter === status.value && 'indeed-btn-primary')}
          >
            {status.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-sm text-muted">
          سفارشی با این وضعیت وجود ندارد.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((order) => (
            <article key={order.id} className="indeed-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-ink">
                    {order.orderNumber} — {order.customerName}
                  </h3>
                  <p className="text-xs text-muted">
                    {order.customerPhone}
                    {order.customerAddress ? ` • ${order.customerAddress}` : ''}
                  </p>
                  <p className="mt-1 text-xs font-bold text-brand">
                    {order.totalAmount.toLocaleString('fa-IR')} تومان •{' '}
                    {order.paymentMethod === 'CARD_TO_CARD' ? 'کارت به کارت' : 'پرداخت در محل'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={field}
                    value={order.status}
                    onChange={(event) => void update(order, { status: event.target.value })}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <select
                    className={field}
                    value={order.paymentStatus}
                    onChange={(event) => void update(order, { paymentStatus: event.target.value })}
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setOpenId(openId === order.id ? null : order.id)} className="indeed-btn py-1 text-xs">
                    {openId === order.id ? 'بستن' : 'اقلام'}
                  </button>
                </div>
              </div>
              {openId === order.id ? (
                <ul className="mt-3 divide-y divide-[var(--vintage-border)] text-xs">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-1.5">
                      <span className="text-ink">{item.title} × {item.quantity.toLocaleString('fa-IR')}</span>
                      <span className="text-muted">{item.lineTotal.toLocaleString('fa-IR')} تومان</span>
                    </li>
                  ))}
                  {order.note ? <li className="py-1.5 text-muted">یادداشت: {order.note}</li> : null}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
