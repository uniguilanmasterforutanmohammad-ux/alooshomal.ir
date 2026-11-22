'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';

import { api } from '@/lib/api';
import type { FinanceInvoice } from '@/lib/api/types/finance';
import { useAuth } from '@/lib/auth';
import { printInvoiceDocument } from '@/lib/invoice-print';
import { cn } from '@/lib/utils';

interface PaymentDetailRow {
  label: string;
  value: string;
}

interface MyPayment {
  id: string;
  kind: 'SUBSCRIPTION' | 'SERVICE' | 'WALLET' | 'BOOST' | 'AD' | 'BUSINESS_MODULE';
  title: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';
  createdAt: string;
  paidAt: string | null;
  refId: string | null;
  failureReason: string | null;
  details: PaymentDetailRow[];
  invoiceId: string | null;
  results: Array<{ label: string; ok: boolean; message: string }>;
}

const KIND_LABELS: Record<MyPayment['kind'], string> = {
  SUBSCRIPTION: 'اشتراک',
  SERVICE: 'استعلام/خدمت',
  WALLET: 'کیف پول',
  BOOST: 'پله',
  AD: 'تبلیغ',
  BUSINESS_MODULE: 'ماژول کسب‌وکار',
};

const STATUS_META: Record<
  MyPayment['status'],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  PAID: {
    label: 'پرداخت موفق',
    className: 'bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  PENDING: {
    label: 'در انتظار پرداخت',
    className: 'bg-amber-50 text-amber-700',
    icon: Clock3,
  },
  FAILED: {
    label: 'ناموفق',
    className: 'bg-red-50 text-red-700',
    icon: XCircle,
  },
  CANCELED: {
    label: 'لغو شده',
    className: 'bg-slate-100 text-slate-600',
    icon: XCircle,
  },
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

export default function MyPaymentsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [payments, setPayments] = useState<MyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | MyPayment['status']>('all');
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MyPayment[]>('/payments/mine');
      setPayments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری پرداخت‌ها ناموفق بود');
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

  const visible = useMemo(
    () =>
      filter === 'all'
        ? payments
        : payments.filter((payment) => payment.status === filter),
    [payments, filter],
  );

  const summary = useMemo(() => {
    const paid = payments.filter((payment) => payment.status === 'PAID');
    return {
      count: payments.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [payments]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <CreditCard className="size-5 text-brand" aria-hidden />
          پرداخت‌های من
        </h1>
        <p className="mt-1 text-sm leading-7 text-muted">
          همه‌ی پرداخت‌های شما (اشتراک، استعلام، کیف پول، پله، تبلیغ و ماژول
          کسب‌وکار) همراه با جزئیات سفارش، وضعیت و فاکتور رسمی.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="indeed-panel p-3">
          <p className="text-[11px] text-muted">کل پرداخت‌ها</p>
          <p className="mt-1 font-extrabold text-ink">
            {summary.count.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="indeed-panel p-3">
          <p className="text-[11px] text-muted">موفق</p>
          <p className="mt-1 font-extrabold text-emerald-700">
            {summary.paidCount.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="indeed-panel p-3">
          <p className="text-[11px] text-muted">جمع پرداخت موفق</p>
          <p className="mt-1 text-xs font-extrabold text-brand">
            {faPrice(summary.paidAmount)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['all', 'همه'],
            ['PAID', 'موفق'],
            ['PENDING', 'در انتظار'],
            ['FAILED', 'ناموفق'],
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
        <p className="text-sm text-muted">پرداختی با این وضعیت ثبت نشده است.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((payment) => {
            const meta = STATUS_META[payment.status];
            const Icon = meta.icon;
            return (
              <div key={payment.id} className="indeed-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-ink">{payment.title}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {KIND_LABELS[payment.kind]} — {faDateTime(payment.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                      meta.className,
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {meta.label}
                  </span>
                </div>

                <p className="mt-2 text-lg font-extrabold text-brand">
                  {faPrice(payment.amount)}
                </p>

                <div className="mt-2 grid gap-1 text-[11px] text-muted sm:grid-cols-2">
                  {payment.details.map((row) => (
                    <p key={row.label}>
                      <span className="font-bold text-ink">{row.label}: </span>
                      {row.value}
                    </p>
                  ))}
                  {payment.paidAt ? (
                    <p>
                      <span className="font-bold text-ink">زمان پرداخت: </span>
                      {faDateTime(payment.paidAt)}
                    </p>
                  ) : null}
                  {payment.refId ? (
                    <p dir="ltr">
                      <span className="font-bold text-ink">کد پیگیری: </span>
                      {payment.refId}
                    </p>
                  ) : null}
                </div>

                {payment.invoiceId ? (
                  <button
                    type="button"
                    onClick={() => void openInvoice(payment.invoiceId!)}
                    disabled={invoiceBusy === payment.invoiceId}
                    className="indeed-btn indeed-btn-secondary mt-2 py-1.5 text-[11px]"
                  >
                    {invoiceBusy === payment.invoiceId ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <FileText className="size-3.5" aria-hidden />
                    )}
                    {invoiceBusy === payment.invoiceId
                      ? 'در حال دریافت فاکتور...'
                      : 'مشاهده و چاپ فاکتور'}
                  </button>
                ) : null}

                {payment.failureReason ? (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700">
                    {payment.failureReason}
                  </p>
                ) : null}

                {payment.results.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-line bg-background p-2">
                    <p className="text-[11px] font-bold text-ink">نتیجه استعلام‌ها</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {payment.results.map((result) => (
                        <li
                          key={`${payment.id}-${result.label}`}
                          className={cn(
                            'flex items-start gap-1 text-[11px]',
                            result.ok ? 'text-emerald-700' : 'text-red-700',
                          )}
                        >
                          {result.ok ? (
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          ) : (
                            <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          )}
                          <span>
                            <span className="font-bold">{result.label}: </span>
                            {result.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
