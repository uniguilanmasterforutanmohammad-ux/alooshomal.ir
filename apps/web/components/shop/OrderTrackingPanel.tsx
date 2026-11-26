'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import { OrderPayPanel } from '@/components/shop/OrderPayPanel';
import { OwnerOrderManager } from '@/components/shop/OwnerOrderManager';
import { api, type PublicOrderTracking } from '@/lib/api';

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار واریز',
  CONFIRMED: 'تأییدشده',
  PAID: 'پرداخت‌شده',
  SHIPPED: 'ارسال‌شده',
  DELIVERED: 'تحویل‌شده',
  CANCELLED: 'لغوشده',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'پرداخت‌نشده',
  PENDING_REVIEW: 'در انتظار بررسی رسید',
  PAID: 'پرداخت تأییدشده',
  REFUNDED: 'بازگشت‌داده‌شده',
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار آماده‌سازی',
  PREPARING: 'در حال آماده‌سازی',
  READY: 'آماده‌ی تحویل',
  DISPATCHED: 'تحویل به پیک',
  DELIVERED: 'تحویل‌شده',
  FAILED: 'ناموفق در تحویل',
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'سفارش ثبت شد',
  PAYMENT_SUBMITTED: 'رسید پرداخت ارسال شد',
  PAYMENT_APPROVED: 'پرداخت تأیید شد',
  PAYMENT_REJECTED: 'رسید پرداخت رد شد',
  STATUS_CHANGED: 'تغییر وضعیت',
  NOTE: 'یادداشت فروشگاه',
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Full order state (status, items, payment/receipt, timeline). Shared by the
 * public tracking page and the cart so a customer sees every confirmation step
 * and can upload a receipt without leaving the cart.
 */
export function OrderTrackingPanel({
  order,
  slug,
}: {
  order: PublicOrderTracking;
  slug: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="indeed-panel grid gap-3 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">وضعیت سفارش</p>
          <p className="text-sm font-extrabold text-ink">
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">وضعیت پرداخت</p>
          <p className="text-sm font-extrabold text-ink">
            {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">وضعیت تحویل</p>
          <p className="text-sm font-extrabold text-ink">
            {DELIVERY_STATUS_LABELS[order.deliveryStatus] ?? order.deliveryStatus}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">روش تحویل</p>
          <p className="text-sm font-extrabold text-ink">
            {order.deliveryMethod === 'PICKUP' ? 'دریافت حضوری' : 'ارسال با پیک'}
          </p>
        </div>
      </section>

      <section className="indeed-panel p-5">
        <h2 className="mb-3 text-sm font-extrabold text-ink">اقلام سفارش</h2>
        <ul className="divide-y divide-[var(--vintage-border)] text-xs">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-center justify-between py-1.5">
              <span className="text-ink">
                {item.title} × {item.quantity.toLocaleString('fa-IR')}
              </span>
              <span className="text-muted">
                {item.lineTotal.toLocaleString('fa-IR')} تومان
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t border-[var(--vintage-border)] pt-3 text-xs">
          <div className="flex justify-between text-muted">
            <span>جمع کالاها</span>
            <span>{order.itemsAmount.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>کرایه‌ی ارسال</span>
            <span>{order.deliveryFee.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-brand">
            <span>مبلغ نهایی</span>
            <span>{order.totalAmount.toLocaleString('fa-IR')} تومان</span>
          </div>
        </div>
      </section>

      <OrderPayPanel slug={slug} order={order} />

      <section className="indeed-panel p-5">
        <h2 className="mb-3 text-sm font-extrabold text-ink">خط زمانی</h2>
        <ol className="flex flex-col gap-3">
          {order.events.map((event, index) => (
            <li key={index} className="flex gap-3 text-xs">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-brand" aria-hidden />
              <span>
                <span className="block font-bold text-ink">
                  {EVENT_LABELS[event.kind] ?? event.kind}
                </span>
                {event.note ? (
                  <span className="block text-muted">{event.note}</span>
                ) : null}
                <span className="block text-[11px] text-muted">
                  {formatDate(event.createdAt)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {order.shop.pickupAddress || order.shop.supportPhone ? (
        <section className="indeed-panel p-5 text-xs leading-6 text-muted">
          {order.shop.pickupAddress ? (
            <p>نشانی دریافت حضوری: {order.shop.pickupAddress}</p>
          ) : null}
          {order.shop.pickupHours ? (
            <p>ساعات مراجعه: {order.shop.pickupHours}</p>
          ) : null}
          {order.shop.supportPhone ? (
            <p>
              پشتیبانی:{' '}
              <a href={`tel:${order.shop.supportPhone}`} className="font-bold text-brand">
                {order.shop.supportPhone}
              </a>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/** Fetches a tracking payload by token and renders `OrderTrackingPanel`. */
export function OrderTrackingLoader({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const [order, setOrder] = useState<PublicOrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setOrder(
        await api.get<PublicOrderTracking>(
          `/public/shops/${encodeURIComponent(slug)}/orders/${encodeURIComponent(token)}`,
        ),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        در حال بارگذاری وضعیت سفارش…
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="flex flex-col gap-2 p-4 text-xs text-red-700">
        وضعیت سفارش در دسترس نیست.
        <button type="button" onClick={() => void load()} className="w-fit text-brand underline">
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          شماره سفارش:{' '}
          <span className="font-bold text-ink">{order.orderNumber}</span>
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          بروزرسانی وضعیت
        </button>
      </div>
      <OwnerOrderManager slug={slug} token={token} />
      <OrderTrackingPanel order={order} slug={slug} />
    </div>
  );
}
