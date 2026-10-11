'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Check, Crown, Sparkles } from 'lucide-react';

import { api, type MySubscriptions, type SubscriptionPlan } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  ACTIVE: 'فعال',
  REJECTED: 'ردشده',
  CANCELLED: 'لغو شده',
};

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

  async function requestPlan(plan: SubscriptionPlan) {
    setBusyPlanId(plan.id);
    setMessage(null);
    setError(null);
    try {
      await api.post('/subscriptions/request', { planId: plan.id });
      setMessage('درخواست شما ثبت شد. پس از تأیید مدیر، اشتراک شما فعال می‌شود.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
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
          بسته مناسب خود را انتخاب کنید؛ پس از تأیید مدیر، اشتراک فعال می‌شود.
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
                onClick={() => requestPlan(plan)}
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
                      ? 'در حال ثبت...'
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
    </div>
  );
}
