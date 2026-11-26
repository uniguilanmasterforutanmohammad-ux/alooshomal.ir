'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Receipt,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react';

import { api, type FinanceInvoice, type MyPurchaseOrder } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { printInvoiceDocument } from '@/lib/invoice-print';
import { cn } from '@/lib/utils';

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
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

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  UNPAID: 'bg-slate-100 text-slate-600',
  REFUNDED: 'bg-sky-50 text-sky-700',
};

function faPrice(value: number): string {
  return `${value.toLocaleString('fa-IR')} تومان`;
}

function faDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function MyPurchaseHistoryPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [orders, setOrders] = useState<MyPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'done' | 'cancelled'>(
    'all',
  );
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await api.get<MyPurchaseOrder[]>('/retail/my-orders'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری سوابق خرید ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login?next=/dashboard/payments');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  async function openInvoice(invoiceId: string) {
    setInvoiceBusy(invoiceId);
    try {
      const invoice = await api.get<FinanceInvoice>(`/payments/invoices/${invoiceId}`);
      if (!printInvoiceDocument(invoice)) {
        setError('نمایش فاکتور ناموفق بود؛ ممکن است پنجره‌ی چاپ مسدود شده باشد.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت فاکتور ناموفق بود');
    } finally {
      setInvoiceBusy(null);
    }
  }

  const visible = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'cancelled') {
      return orders.filter((order) => order.status === 'CANCELLED');
    }
    if (filter === 'done') {
      return orders.filter((order) => order.status === 'DELIVERED');
    }
    return orders.filter(
      (order) => order.status !== 'CANCELLED' && order.status !== 'DELIVERED',
    );
  }, [orders, filter]);

  const summary = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatus === 'PAID');
    return {
      count: orders.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, order) => sum + order.totalAmount, 0),
    };
  }, [orders]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <Receipt className="size-5 text-brand" aria-hidden />
          سوابق خرید
        </h1>
        <p className="mt-1 text-sm leading-7 text-muted">
          همه‌ی خریدهای شما از فروشگاه‌های شمالی‌کارت، همراه با وضعیت سفارش،
          پرداخت و لینک پیگیری.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="indeed-panel p-3">
          <p className="text-[11px] text-muted">کل خریدها</p>
          <p className="mt-1 font-extrabold text-ink">
            {summary.count.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="indeed-panel p-3">
          <p className="text-[11px] text-muted">پرداخت‌شده</p>
          <p className="mt-1 font-extrabold text-emerald-700">
            {summary.paidCount.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="indeed-panel p-3">
          <p className="text-[11px] text-muted">جمع خرید موفق</p>
          <p className="mt-1 text-xs font-extrabold text-brand">
            {faPrice(summary.paidAmount)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['all', 'همه'],
            ['open', 'در جریان'],
            ['done', 'تحویل‌شده'],
            ['cancelled', 'لغوشده'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-bold',
              filter === key
                ? 'bg-brand text-white'
                : 'bg-surface text-muted ring-1 ring-line',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          در حال بارگذاری...
        </p>
      ) : visible.length === 0 ? (
        <div className="indeed-panel flex flex-col items-center gap-3 p-10 text-center">
          <ShoppingBag className="size-10 text-muted" aria-hidden />
          <p className="text-sm font-bold text-ink">هنوز خریدی ثبت نشده است</p>
          <p className="text-xs text-muted">
            از فروشگاه‌های آنلاین شمالی‌کارت خرید کنید تا سوابق اینجا نمایش داده شود.
          </p>
          <Link href="/shop" className="indeed-btn indeed-btn-primary">
            رفتن به فروشگاه‌ها
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => {
            const trackingHref =
              order.shop.publicSlug && order.trackingToken
                ? `/shop/${order.shop.publicSlug}/track/${order.trackingToken}`
                : null;
            const paymentClass =
              PAYMENT_STATUS_CLASS[order.paymentStatus] ?? 'bg-slate-100 text-slate-600';
            return (
              <div key={order.id} className="indeed-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-ink">{order.shop.name}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      سفارش {order.orderNumber} — {faDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
                      {order.status === 'DELIVERED' ? (
                        <CheckCircle2 className="size-3.5" aria-hidden />
                      ) : order.status === 'CANCELLED' ? (
                        <XCircle className="size-3.5" aria-hidden />
                      ) : (
                        <Clock3 className="size-3.5" aria-hidden />
                      )}
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        paymentClass,
                      )}
                    >
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                  </div>
                </div>

                <ul className="mt-3 divide-y divide-[var(--vintage-border)] text-xs">
                  {order.items.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-ink">
                        {item.title} × {item.quantity.toLocaleString('fa-IR')}
                      </span>
                      <span className="text-muted">
                        {item.lineTotal.toLocaleString('fa-IR')} تومان
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--vintage-border)] pt-2">
                  <p className="flex items-center gap-1 text-[11px] text-muted">
                    <Truck className="size-3.5" aria-hidden />
                    {order.deliveryMethod === 'PICKUP' ? 'دریافت حضوری' : 'ارسال با پیک'}
                  </p>
                  <p className="text-sm font-extrabold text-brand">
                    {faPrice(order.totalAmount)}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {trackingHref ? (
                    <Link
                      href={trackingHref}
                      className="indeed-btn indeed-btn-secondary py-1.5 text-[11px]"
                    >
                      <Receipt className="size-3.5" aria-hidden />
                      پیگیری سفارش
                    </Link>
                  ) : null}
                  {order.invoiceId ? (
                    <button
                      type="button"
                      onClick={() => void openInvoice(order.invoiceId!)}
                      disabled={invoiceBusy === order.invoiceId}
                      className="indeed-btn indeed-btn-secondary py-1.5 text-[11px]"
                    >
                      {invoiceBusy === order.invoiceId ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <FileText className="size-3.5" aria-hidden />
                      )}
                      {invoiceBusy === order.invoiceId
                        ? 'در حال دریافت فاکتور...'
                        : 'مشاهده و چاپ فاکتور'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
