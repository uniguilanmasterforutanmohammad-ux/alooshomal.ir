'use client';

import Link from 'next/link';
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

const DELIVERY_STATUSES = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'PREPARING', label: 'در حال آماده‌سازی' },
  { value: 'READY', label: 'آماده‌ی تحویل' },
  { value: 'DISPATCHED', label: 'تحویل به پیک' },
  { value: 'DELIVERED', label: 'تحویل‌شده' },
  { value: 'FAILED', label: 'ناموفق' },
];

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'ثبت سفارش',
  PAYMENT_SUBMITTED: 'ارسال رسید',
  PAYMENT_APPROVED: 'تأیید پرداخت',
  PAYMENT_REJECTED: 'رد رسید',
  STATUS_CHANGED: 'تغییر وضعیت',
  NOTE: 'یادداشت',
};

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

  async function update(order: RetailOrder, patch: Record<string, unknown>) {
    await api.patch(`/retail/orders/${order.id}`, patch);
    await load();
    toast.success('سفارش به‌روزرسانی شد');
  }

  async function saveCosts(order: RetailOrder, form: HTMLFormElement) {
    const data = new FormData(form);
    await update(order, {
      costAmount: Number(data.get('costAmount')) || 0,
      packagingFee: Number(data.get('packagingFee')) || 0,
      courierActualFee: Number(data.get('courierActualFee')) || 0,
      refundAmount: Number(data.get('refundAmount')) || 0,
      cancelReason: String(data.get('cancelReason') ?? '').trim() || undefined,
    });
  }

  async function approveOrder(order: RetailOrder) {
    await api.post(`/retail/orders/${order.id}/approve`, {});
    toast.success('سفارش تأیید شد؛ مشتری اکنون می‌تواند پرداخت کند');
    await load();
  }

  async function declineOrder(order: RetailOrder) {
    const reason = window.prompt('دلیل رد سفارش (اختیاری):') ?? '';
    if (!window.confirm('این سفارش رد و موجودی کالاها آزاد شود؟')) return;
    await api.post(`/retail/orders/${order.id}/decline`, {
      reason: reason.trim() || undefined,
    });
    toast.success('سفارش رد شد');
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">سفارش‌ها</h1>
        <p className="mt-1 text-sm text-muted">
          سفارش‌های ثبت‌شده از ویترین عمومی؛ وضعیت پرداخت، تحویل و هزینه‌های هر
          سفارش را اینجا مدیریت کنید.
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
          {items.map((order) => {
            const profit =
              order.totalAmount -
              order.costAmount -
              order.packagingFee -
              order.courierActualFee;
            const trackingHref =
              workspace?.publicSlug && order.trackingToken
                ? `/shop/${workspace.publicSlug}/track/${order.trackingToken}`
                : null;
            return (
              <article key={order.id} className="indeed-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">
                      {order.orderNumber} — {order.customerName}
                    </h3>
                    <p className="text-xs text-muted">
                      {order.customerPhone}
                      {order.neighborhood ? ` • ${order.neighborhood}` : ''}
                      {order.customerAddress ? ` • ${order.customerAddress}` : ''}
                    </p>
                    <p className="mt-1 text-xs font-bold text-brand">
                      {order.totalAmount.toLocaleString('fa-IR')} تومان •{' '}
                      {order.deliveryMethod === 'PICKUP' ? 'دریافت حضوری' : 'ارسال با پیک'} •{' '}
                      {order.paymentMethod === 'CARD_TO_CARD' ? 'کارت به کارت' : 'پرداخت در محل'}
                    </p>
                    {trackingHref ? (
                      <Link href={trackingHref} target="_blank" className="mt-1 inline-block text-[11px] font-bold text-brand underline">
                        لینک پیگیری مشتری
                      </Link>
                    ) : null}
                    {order.paymentStatus === 'PENDING_REVIEW' ? (
                      <Link
                        href="/dashboard/business/card-to-card"
                        className="mt-1 block text-[11px] font-bold text-amber-700 underline"
                      >
                        رسید پرداخت در انتظار بررسی است — بررسی در «کارت به کارت»
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void approveOrder(order)}
                          className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                        >
                          تأیید سفارش
                        </button>
                        <button
                          type="button"
                          onClick={() => void declineOrder(order)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          رد سفارش
                        </button>
                      </>
                    ) : null}
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
                    <select
                      className={field}
                      value={order.deliveryStatus}
                      onChange={(event) => void update(order, { deliveryStatus: event.target.value })}
                    >
                      {DELIVERY_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setOpenId(openId === order.id ? null : order.id)} className="indeed-btn py-1 text-xs">
                      {openId === order.id ? 'بستن' : 'جزئیات'}
                    </button>
                  </div>
                </div>

                {openId === order.id ? (
                  <div className="mt-3 flex flex-col gap-3 border-t border-[var(--vintage-border)] pt-3">
                    <ul className="divide-y divide-[var(--vintage-border)] text-xs">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between py-1.5">
                          <span className="text-ink">{item.title} × {item.quantity.toLocaleString('fa-IR')}</span>
                          <span className="text-muted">{item.lineTotal.toLocaleString('fa-IR')} تومان</span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between py-1.5 text-muted">
                        <span>کرایه‌ی ارسال</span>
                        <span>{order.deliveryFee.toLocaleString('fa-IR')} تومان</span>
                      </li>
                    </ul>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveCosts(order, event.currentTarget);
                      }}
                      className="grid gap-2 rounded-lg bg-[var(--vintage-paper)] p-3 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      <label className="flex flex-col gap-1 text-[11px] text-muted">
                        بهای خرید کالا
                        <input name="costAmount" type="number" min={0} defaultValue={order.costAmount} className={field} />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-muted">
                        بسته‌بندی
                        <input name="packagingFee" type="number" min={0} defaultValue={order.packagingFee} className={field} />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-muted">
                        کرایه‌ی واقعی پیک
                        <input name="courierActualFee" type="number" min={0} defaultValue={order.courierActualFee} className={field} />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-muted">
                        بازپرداخت
                        <input name="refundAmount" type="number" min={0} defaultValue={order.refundAmount} className={field} />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-muted sm:col-span-2 lg:col-span-3">
                        دلیل لغو (در صورت لغو)
                        <input name="cancelReason" defaultValue={order.cancelReason ?? ''} className={field} />
                      </label>
                      <div className="flex items-end gap-2">
                        <button type="submit" className="indeed-btn indeed-btn-primary py-1 text-xs">ذخیره</button>
                        <span className="text-[11px] font-bold text-ink">
                          سود: {profit.toLocaleString('fa-IR')}
                        </span>
                      </div>
                    </form>

                    {order.events && order.events.length > 0 ? (
                      <ol className="flex flex-col gap-1.5 text-[11px] text-muted">
                        {order.events.map((event) => (
                          <li key={event.id} className="flex items-center justify-between gap-2">
                            <span>
                              {EVENT_LABELS[event.kind] ?? event.kind}
                              {event.note ? ` — ${event.note}` : ''}
                            </span>
                            <span>{new Date(event.createdAt).toLocaleString('fa-IR')}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
