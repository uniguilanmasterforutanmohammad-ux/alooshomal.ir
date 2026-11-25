import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { OrderPayPanel } from '@/components/shop/OrderPayPanel';
import type { PublicOrderTracking } from '@/lib/api';
import { SERVER_API_URL, decodeSlugParam } from '@/lib/site';

async function fetchTracking(
  slug: string,
  token: string,
): Promise<PublicOrderTracking | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/shops/${encodeURIComponent(decodeSlugParam(slug))}/orders/${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: PublicOrderTracking };
    return payload.data;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: 'پیگیری سفارش',
  robots: { index: false, follow: false },
};

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

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const order = await fetchTracking(slug, token);
  if (!order) notFound();

  return (
    <>
      <Header />
      <main className="container-page mx-auto max-w-3xl py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">پیگیری سفارش</h1>
          <p className="mt-1 text-sm text-muted">
            {order.shop.name} • شماره سفارش{' '}
            <span className="font-bold text-ink">{order.orderNumber}</span>
          </p>
        </div>

        <section className="indeed-panel mb-4 grid gap-3 p-5 sm:grid-cols-2">
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

        <section className="indeed-panel mb-4 p-5">
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

        <div className="mb-4">
          <OrderPayPanel
            slug={order.shop.publicSlug ?? decodeSlugParam(slug)}
            order={order}
          />
        </div>

        <section className="indeed-panel mb-4 p-5">
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
            {order.shop.pickupHours ? <p>ساعات مراجعه: {order.shop.pickupHours}</p> : null}
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

        <Link
          href={order.shop.publicSlug ? `/shop/${order.shop.publicSlug}` : '/shop'}
          className="mt-4 inline-block text-xs font-bold text-brand underline"
        >
          بازگشت به فروشگاه
        </Link>
      </main>
    </>
  );
}
