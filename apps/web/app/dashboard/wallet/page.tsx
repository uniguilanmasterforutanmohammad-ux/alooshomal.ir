'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Wallet as WalletIcon,
} from 'lucide-react';

import {
  api,
  type MyWallet,
  type WalletCheckout,
  type WalletEntry,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatJalali } from '@/lib/jalali';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<string, string> = {
  IDENTITY_INQUIRY: 'استعلام اطلاعات هویتی',
  PHONE_MATCH: 'تطبیق موبایل و کد ملی',
  SUBSCRIPTION: 'خرید اشتراک',
  ADJUSTMENT: 'تنظیم مدیر',
  PAYMENT: 'پرداخت',
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'در انتظار پرداخت',
  PAID: 'پرداخت موفق',
  FAILED: 'پرداخت ناموفق',
  CANCELED: 'لغو شده',
};

function faPrice(amount: number): string {
  return `${Math.abs(amount).toLocaleString('fa-IR')} تومان`;
}

function faDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * «کیف پول» — the user's running tab. Billable actions accrue as a negative
 * balance, the admin sets the settlement window, and one gateway payment clears
 * the whole amount once (before/after the due date).
 */
export default function WalletPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [wallet, setWallet] = useState<MyWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setWallet(await api.get<MyWallet>('/wallet/me'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کیف پول');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;
    if (payment === 'success') {
      setMessage('پرداخت با موفقیت انجام شد و بدهی کیف پول تسویه شد.');
    } else if (payment === 'pending') {
      setMessage(
        'تأیید پرداخت در حال پردازش است؛ چند لحظه بعد این صفحه را دوباره باز کنید.',
      );
    } else {
      setError(
        'پرداخت ناموفق بود یا لغو شد. در صورت کسر وجه، با پشتیبانی تماس بگیرید.',
      );
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url.toString());
  }, []);

  async function settle() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const checkout = await api.post<WalletCheckout>('/wallet/checkout');
      if (!checkout?.url) {
        throw new Error('لینک پرداخت از درگاه دریافت نشد');
      }
      window.location.href = checkout.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  const balance = wallet?.balance ?? 0;
  const debt = balance < 0 ? -balance : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <WalletIcon className="size-5 text-brand" aria-hidden />
          کیف پول
        </h2>
        <p className="text-sm text-muted">
          هزینه استعلام‌ها و اشتراک‌ها به‌صورت بدهی در کیف پول جمع می‌شود؛ تا
          سررسید فقط یک‌بار کل مبلغ را پرداخت می‌کنید.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-muted">وضعیت حساب</p>
          <p
            className={cn(
              'mt-1 text-2xl font-extrabold',
              debt > 0 ? 'text-red-600' : 'text-emerald-600',
            )}
          >
            {debt > 0 ? `${faPrice(debt)} بدهی` : 'تسویه‌شده'}
          </p>
          <p className="mt-1 text-xs text-muted">
            {wallet?.dueAt
              ? `سررسید تسویه: ${formatJalali(wallet.dueAt)}`
              : `مهلت تسویه هر دوره ${wallet?.settlementDays ?? 7} روز است.`}
          </p>
          {wallet?.overdue ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600">
              <AlertTriangle className="size-4" aria-hidden />
              سررسید گذشته است؛ لطفاً هرچه سریع‌تر تسویه کنید.
            </p>
          ) : null}
        </div>
        {debt > 0 ? (
          <button
            type="button"
            onClick={() => void settle()}
            disabled={busy}
            className="indeed-btn indeed-btn-primary"
          >
            <CreditCard className="size-4" aria-hidden />
            {busy ? 'در حال انتقال به درگاه...' : `پرداخت یک‌جای ${faPrice(debt)}`}
          </button>
        ) : null}
      </div>

      <div className="indeed-panel overflow-hidden">
        <div className="border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
          <h3 className="text-sm font-extrabold text-ink">گردش حساب</h3>
        </div>
        {wallet && wallet.entries.length > 0 ? (
          <ul className="divide-y divide-[var(--vintage-border)]">
            {wallet.entries.map((entry: WalletEntry) => {
              const isDebt = entry.amount < 0;
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <span className="flex items-center gap-2 font-bold text-ink">
                    {isDebt ? (
                      <ArrowUpRight className="size-4 text-red-500" aria-hidden />
                    ) : (
                      <ArrowDownLeft
                        className="size-4 text-emerald-600"
                        aria-hidden
                      />
                    )}
                    {entry.title || KIND_LABELS[entry.kind] || entry.kind}
                  </span>
                  <span
                    className={cn(
                      'font-extrabold',
                      isDebt ? 'text-red-600' : 'text-emerald-600',
                    )}
                  >
                    {isDebt ? '−' : '+'}
                    {faPrice(entry.amount)}
                  </span>
                  <span className="w-full text-xs text-muted">
                    {faDateTime(entry.createdAt)}
                    {KIND_LABELS[entry.kind] ? ` · ${KIND_LABELS[entry.kind]}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">
            هنوز هزینه‌ای در کیف پول شما ثبت نشده است.
          </p>
        )}
      </div>

      {wallet && wallet.payments.length > 0 ? (
        <div className="indeed-panel overflow-hidden">
          <div className="border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
            <h3 className="text-sm font-extrabold text-ink">تاریخچه پرداخت‌ها</h3>
          </div>
          <ul className="divide-y divide-[var(--vintage-border)]">
            {wallet.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="font-bold text-ink">{faPrice(payment.amount)}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    payment.status === 'PAID'
                      ? 'bg-green-50 text-green-700'
                      : payment.status === 'FAILED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {PAYMENT_LABELS[payment.status] ?? payment.status}
                </span>
                <span className="w-full text-xs text-muted">
                  تاریخ: {faDateTime(payment.createdAt)}
                  {payment.refId ? ` · کد رهگیری: ${payment.refId}` : ''}
                </span>
                {payment.failureReason ? (
                  <span className="w-full text-xs text-red-600">
                    {payment.failureReason}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
