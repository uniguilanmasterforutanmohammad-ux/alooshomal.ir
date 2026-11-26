'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';

import { api, type RetailOrder } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

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

/**
 * Owner-only management panel shown on the customer tracking page. It mirrors
 * the actions of `/dashboard/business/orders` and works on the same order
 * record, so both views always stay in sync.
 */
export function OwnerOrderManager({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const router = useRouter();
  const { token: authToken, hydrated } = useAuth();
  const enabled = hydrated && Boolean(authToken);
  const { workspace } = useBusinessWorkspace(enabled);
  const isOwner =
    Boolean(workspace?.publicSlug) && workspace?.publicSlug === slug;

  const [order, setOrder] = useState<RetailOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(
        await api.get<RetailOrder>(
          `/retail/orders/by-token/${encodeURIComponent(token)}`,
        ),
      );
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOwner) void load();
  }, [isOwner, load]);

  const refresh = useCallback(async () => {
    await load();
    router.refresh();
  }, [load, router]);

  async function update(patch: Record<string, unknown>) {
    if (!order) return;
    await api.patch(`/retail/orders/${order.id}`, patch);
    toast.success('سفارش به‌روزرسانی شد');
    await refresh();
  }

  async function saveCosts(form: HTMLFormElement) {
    const data = new FormData(form);
    await update({
      costAmount: Number(data.get('costAmount')) || 0,
      packagingFee: Number(data.get('packagingFee')) || 0,
      courierActualFee: Number(data.get('courierActualFee')) || 0,
      refundAmount: Number(data.get('refundAmount')) || 0,
      cancelReason: String(data.get('cancelReason') ?? '').trim() || undefined,
    });
  }

  async function approveOrder() {
    if (!order) return;
    await api.post(`/retail/orders/${order.id}/approve`, {});
    toast.success('سفارش تأیید شد؛ مشتری اکنون می‌تواند پرداخت کند');
    await refresh();
  }

  async function declineOrder() {
    if (!order) return;
    const reason = window.prompt('دلیل رد سفارش (اختیاری):') ?? '';
    if (!window.confirm('این سفارش رد و موجودی کالاها آزاد شود؟')) return;
    await api.post(`/retail/orders/${order.id}/decline`, {
      reason: reason.trim() || undefined,
    });
    toast.success('سفارش رد شد');
    await refresh();
  }

  if (!isOwner) return null;

  const profit = order
    ? order.totalAmount -
      order.costAmount -
      order.packagingFee -
      order.courierActualFee
    : 0;

  return (
    <section className="indeed-panel mb-4 border-2 border-brand/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="size-4 text-brand" aria-hidden />
        <h2 className="text-sm font-extrabold text-ink">
          مدیریت سفارش (ویژه‌ی مدیر کسب‌وکار)
        </h2>
      </div>

      {loading && !order ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          در حال بارگذاری…
        </p>
      ) : !order ? (
        <p className="text-xs text-muted">این سفارش برای کسب‌وکار شما پیدا نشد.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            {order.customerName} • {order.customerPhone}
            {order.customerAddress ? ` • ${order.customerAddress}` : ''}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {order.status === 'PENDING' ? (
              <>
                <button
                  type="button"
                  onClick={() => void approveOrder()}
                  className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  تأیید سفارش
                </button>
                <button
                  type="button"
                  onClick={() => void declineOrder()}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  رد سفارش
                </button>
              </>
            ) : null}
            <select
              className={field}
              value={order.status}
              onChange={(event) => void update({ status: event.target.value })}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={order.paymentStatus}
              onChange={(event) =>
                void update({ paymentStatus: event.target.value })
              }
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={order.deliveryStatus}
              onChange={(event) =>
                void update({ deliveryStatus: event.target.value })
              }
            >
              {DELIVERY_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveCosts(event.currentTarget);
            }}
            className="grid gap-2 rounded-lg bg-[var(--vintage-paper)] p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              بهای خرید کالا
              <input
                name="costAmount"
                type="number"
                min={0}
                defaultValue={order.costAmount}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              بسته‌بندی
              <input
                name="packagingFee"
                type="number"
                min={0}
                defaultValue={order.packagingFee}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              کرایه‌ی واقعی پیک
              <input
                name="courierActualFee"
                type="number"
                min={0}
                defaultValue={order.courierActualFee}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              بازپرداخت
              <input
                name="refundAmount"
                type="number"
                min={0}
                defaultValue={order.refundAmount}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted sm:col-span-2 lg:col-span-3">
              دلیل لغو (در صورت لغو)
              <input
                name="cancelReason"
                defaultValue={order.cancelReason ?? ''}
                className={field}
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="indeed-btn indeed-btn-primary py-1 text-xs"
              >
                ذخیره
              </button>
              <span className="text-[11px] font-bold text-ink">
                سود: {profit.toLocaleString('fa-IR')}
              </span>
            </div>
          </form>

          {order.events && order.events.length > 0 ? (
            <ol className="flex flex-col gap-1.5 text-[11px] text-muted">
              {order.events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    {EVENT_LABELS[event.kind] ?? event.kind}
                    {event.note ? ` — ${event.note}` : ''}
                  </span>
                  <span>
                    {new Date(event.createdAt).toLocaleString('fa-IR')}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}
    </section>
  );
}
