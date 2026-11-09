'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Check, Crown, Sparkles } from 'lucide-react';

import {
  api,
  type MySubscriptions,
  type SubscriptionCheckout,
  type SubscriptionPayment,
  type SubscriptionPlan,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  ACTIVE: 'فعال',
  REJECTED: 'ردشده',
  CANCELLED: 'لغو شده',
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'در انتظار پرداخت',
  PAID: 'پرداخت موفق',
  FAILED: 'پرداخت ناموفق',
  CANCELED: 'لغو شده',
};

function faPrice(amount: number): string {
  if (amount <= 0) return 'رایگان';
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

function faDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mine, setMine] = useState<MySubscriptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [planList, subscriptions] = await Promise.all([
        api.get<SubscriptionPlan[]>('/subscriptions/plans'),
        api.get<MySubscriptions>('/subscriptions/me'),
      ]);
      setPlans(planList);
      setMine(subscriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
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
    const planName = params.get('plan');
    if (payment === 'success') {
      setMessage(
        `پرداخت با موفقیت انجام شد${planName ? ` و اشتراک «${planName}»` : ''} فعال شد.`,
      );
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
    url.searchParams.delete('plan');
    window.history.replaceState({}, '', url.toString());
  }, []);

  async function startPlan(plan: SubscriptionPlan) {
    setBusyPlanId(plan.id);
    setMessage(null);
    setError(null);
    try {
      if (plan.price >= 1000) {
        const checkout = await api.post<SubscriptionCheckout>(
          `/subscriptions/${plan.id}/checkout`,
        );
        if (checkout?.wallet) {
          setMessage(
            'هزینه این بسته به کیف پول شما اضافه شد و اشتراک فعال شد؛ تسویه‌ی یک‌جا از بخش کیف پول انجام می‌شود.',
          );
          await load();
          return;
        }
        if (!checkout?.url) {
          throw new Error('لینک پرداخت از درگاه دریافت نشد');
        }
        window.location.href = checkout.url;
        return;
      }
      await api.post('/subscriptions/request', { planId: plan.id });
      setMessage(
        'درخواست شما ثبت شد. پس از تأیید مدیر، اشتراک شما فعال می‌شود.',
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود',
      );
    } finally {
      setBusyPlanId(null);
    }
  }

  const currentPlanId = mine?.plan?.id ?? null;
  const pendingPlanId =
    mine?.requests.find((request) => request.status === 'PENDING')?.planId ?? null;

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">اشتراک من</h2>
        <p className="text-sm text-muted">
          بسته مناسب خود را انتخاب کنید؛ بسته‌های پولی با پرداخت آنلاین بلافاصله
          فعال می‌شوند و بسته‌ی رایگان پس از تأیید مدیر.
        </p>
      </div>

      {mine?.plan ? (
        <div className="indeed-panel flex items-center gap-3 p-4">
          <span className="vintage-avatar flex size-10 items-center justify-center">
            <Crown className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted">اشتراک فعال شما</p>
            <p className="text-lg font-extrabold text-ink">{mine.plan.name}</p>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPending = plan.id === pendingPlanId;
          return (
            <div
              key={plan.id}
              className={cn(
                'indeed-panel flex flex-col p-5',
                isCurrent && 'border-brand ring-2 ring-brand/30',
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-ink">{plan.name}</h3>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                    <BadgeCheck className="size-3" aria-hidden />
                    فعلی
                  </span>
                ) : null}
              </div>

              {plan.description ? (
                <p className="mt-2 text-sm text-muted">{plan.description}</p>
              ) : null}

              <p className="mt-3 text-2xl font-extrabold text-brand">
                {faPrice(plan.price)}
              </p>

              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isCurrent || isPending || busyPlanId === plan.id}
                onClick={() => startPlan(plan)}
                className={cn(
                  'indeed-btn mt-5 w-full py-2 text-sm',
                  isCurrent
                    ? 'indeed-btn-secondary'
                    : 'indeed-btn-primary',
                  (isCurrent || isPending) && 'opacity-70',
                )}
              >
                {isCurrent
                  ? 'اشتراک فعلی شما'
                  : isPending
                    ? 'در انتظار تأیید مدیر'
                    : busyPlanId === plan.id
                      ? plan.price >= 1000
                        ? 'در حال انتقال به درگاه...'
                        : 'در حال ثبت...'
                      : plan.price >= 1000
                        ? 'پرداخت و فعال‌سازی'
                        : 'درخواست اشتراک'}
              </button>
            </div>
          );
        })}
      </div>

      {mine && mine.requests.length > 0 ? (
        <div className="indeed-panel overflow-hidden">
          <div className="border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Sparkles className="size-4 text-brand" aria-hidden />
              تاریخچه درخواست‌ها
            </h3>
          </div>
          <ul className="divide-y divide-[var(--vintage-border)]">
            {mine.requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="font-bold text-ink">{request.plan?.name ?? '—'}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    request.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700'
                      : request.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {STATUS_LABELS[request.status] ?? request.status}
                </span>
                <span className="flex w-full flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>تاریخ درخواست: {faDateTime(request.requestedAt)}</span>
                  {request.decidedAt ? (
                    <span>
                      {request.status === 'REJECTED' ? 'تاریخ رد' : 'تاریخ تأیید'}:{' '}
                      {faDateTime(request.decidedAt)}
                    </span>
                  ) : null}
                </span>
                {request.adminNote ? (
                  <span className="w-full text-xs text-muted">
                    یادداشت مدیر: {request.adminNote}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mine?.payments && mine.payments.length > 0 ? (
        <div className="indeed-panel overflow-hidden">
          <div className="border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Sparkles className="size-4 text-brand" aria-hidden />
              تاریخچه پرداخت‌ها
            </h3>
          </div>
          <ul className="divide-y divide-[var(--vintage-border)]">
            {mine.payments.map((payment: SubscriptionPayment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="font-bold text-ink">
                  {payment.plan?.name ?? '—'}
                </span>
                <span className="text-xs text-muted">
                  {faPrice(payment.amount)}
                </span>
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
