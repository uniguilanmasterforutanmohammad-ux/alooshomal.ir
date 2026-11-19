'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Check,
  Crown,
  CalendarDays,
  Download,
  Receipt,
  Sparkles,
  Store,
} from 'lucide-react';

import {
  api,
  type FinanceInvoice,
  type MySubscriptions,
  type SubscriptionAddonQuote,
  type SubscriptionCheckout,
  type SubscriptionPayment,
  type SubscriptionPlan,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { printInvoiceDocument } from '@/lib/invoice-print';
import {
  PLAN_PERIODS,
  PLAN_PERIOD_LABELS,
  isFreePlan,
  planDiscountPercent,
  planPriceForMonths,
  type PlanPeriodMonths,
} from '@/lib/plan-periods';
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

type PageTab = 'current' | 'plans' | 'history';

const PAGE_TABS: Array<{ key: PageTab; label: string }> = [
  { key: 'current', label: 'اشتراک فعلی' },
  { key: 'plans', label: 'تمدید و ارتقا' },
  { key: 'history', label: 'تاریخچه پرداخت‌ها' },
];

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
  const [months, setMonths] = useState<PlanPeriodMonths>(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // «بسته مدیریت کسب‌وکار» add-on: which businesses are added to the cart for
  // each plan, plus the server-side prorated quote that drives the amounts.
  const [quotes, setQuotes] = useState<Record<string, SubscriptionAddonQuote>>(
    {},
  );
  const [addonSelection, setAddonSelection] = useState<
    Record<string, string[]>
  >({});
  // Mid-term add-on (no new term): which businesses get the management until
  // the current subscription ends.
  const [midtermQuote, setMidtermQuote] =
    useState<SubscriptionAddonQuote | null>(null);
  const [midtermSelection, setMidtermSelection] = useState<string[]>([]);
  const [addonBusy, setAddonBusy] = useState(false);
  const [tab, setTab] = useState<PageTab>('current');
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);

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

  // Refresh the «بسته مدیریت کسب‌وکار» quote for every paid plan whenever the
  // term changes, so the cart always shows the exact prorated amount and the
  // shared expiry date before the buyer reaches the gateway.
  useEffect(() => {
    if (!hydrated || !token || plans.length === 0) return;
    let alive = true;
    void (async () => {
      const paid = plans.filter((plan) => !isFreePlan(plan));
      const fetched = await Promise.all(
        paid.map(async (plan) => {
          try {
            const quote = await api.get<SubscriptionAddonQuote>(
              `/subscriptions/plans/${plan.id}/addon-quote?months=${months}`,
            );
            return [plan.id, quote] as const;
          } catch {
            return [plan.id, null] as const;
          }
        }),
      );
      if (!alive) return;
      const next: Record<string, SubscriptionAddonQuote> = {};
      for (const [id, quote] of fetched) {
        if (quote) next[id] = quote;
      }
      setQuotes(next);
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, token, plans, months]);

  // Quote for the mid-term add-on of the plan the user is already on: priced
  // for the days left and expiring with the current subscription.
  const currentPlanId = mine?.plan?.id ?? null;
  const currentPlanPaid = Boolean(
    mine?.plan && !isFreePlan(mine.plan) && currentPlanId,
  );
  useEffect(() => {
    if (!hydrated || !token || !currentPlanId || !currentPlanPaid) {
      setMidtermQuote(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const quote = await api.get<SubscriptionAddonQuote>(
          `/subscriptions/plans/${currentPlanId}/addon-quote?months=0`,
        );
        if (alive) setMidtermQuote(quote);
      } catch {
        if (alive) setMidtermQuote(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, token, currentPlanId, currentPlanPaid, mine?.planExpiresAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;
    const planName = params.get('plan');
    const activation = params.get('activation');
    if (payment === 'success') {
      setMessage(
        activation === 'pending'
          ? `پرداخت${planName ? ` «${planName}»` : ''} با موفقیت انجام شد؛ برای فعال‌سازی، دکمه‌ی زیر را بزنید.`
          : `پرداخت با موفقیت انجام شد${planName ? ` و اشتراک «${planName}»` : ''} فعال شد.`,
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
    url.searchParams.delete('activation');
    window.history.replaceState({}, '', url.toString());
  }, []);

  async function startPlan(plan: SubscriptionPlan) {
    setBusyPlanId(plan.id);
    setMessage(null);
    setError(null);
    try {
      // The free plan always runs on a monthly term.
      const planMonths = isFreePlan(plan) ? 1 : months;
      const quote = quotes[plan.id];
      const workspaceIds = isFreePlan(plan)
        ? []
        : (addonSelection[plan.id] ?? []);
      const addonTotal = workspaceIds.reduce(
        (sum, id) =>
          sum +
          (quote?.workspaces.find((item) => item.workspaceId === id)?.amount ??
            0),
        0,
      );
      const amount = planPriceForMonths(plan, planMonths) + addonTotal;
      if (amount >= 1000) {
        const checkout = await api.post<SubscriptionCheckout>(
          `/subscriptions/${plan.id}/checkout`,
          { months: planMonths, workspaceIds },
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
      await api.post('/subscriptions/request', {
        planId: plan.id,
        months: planMonths,
      });
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

  async function activatePending(id: string) {
    setBusyPlanId(id);
    setMessage(null);
    setError(null);
    try {
      await api.post(`/subscriptions/${id}/activate`, {});
      setMessage('اشتراک جدید فعال شد.');
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'فعال‌سازی اشتراک ناموفق بود',
      );
    } finally {
      setBusyPlanId(null);
    }
  }

  /** Buy the management add-on for the rest of the running term. */
  async function startAddon() {
    if (midtermSelection.length === 0) return;
    setAddonBusy(true);
    setMessage(null);
    setError(null);
    try {
      const checkout = await api.post<SubscriptionCheckout>(
        '/subscriptions/addon/checkout',
        {
          workspaceIds: midtermSelection,
          returnTo: '/dashboard/subscriptions',
        },
      );
      if (checkout?.wallet) {
        setMessage(
          'هزینه‌ی افزودنی به کیف پول شما اضافه شد و بسته فعال شد.',
        );
        await load();
        return;
      }
      if (!checkout?.url) {
        throw new Error('لینک پرداخت از درگاه دریافت نشد');
      }
      window.location.href = checkout.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود');
    } finally {
      setAddonBusy(false);
    }
  }

  /** Add/remove one business from a plan's «بسته مدیریت کسب‌وکار» cart. */
  function toggleAddonWorkspace(
    planId: string,
    workspaceId: string,
    maxBusinesses: number,
  ) {
    setAddonSelection((prev) => {
      const current = prev[planId] ?? [];
      if (current.includes(workspaceId)) {
        return { ...prev, [planId]: current.filter((id) => id !== workspaceId) };
      }
      if (current.length >= maxBusinesses) return prev;
      return { ...prev, [planId]: [...current, workspaceId] };
    });
  }

  /** Fetch the archived invoice of one payment and open its print/PDF view. */
  async function downloadInvoice(paymentId: string) {
    setInvoiceBusy(paymentId);
    setError(null);
    try {
      const invoice = await api.get<FinanceInvoice>(
        `/subscriptions/payments/${paymentId}/invoice`,
      );
      if (!printInvoiceDocument(invoice)) {
        setError('مرورگر پنجره‌ی چاپ را مسدود کرد؛ اجازه‌ی بازشدن پنجره را بدهید.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت فاکتور ناموفق بود');
    } finally {
      setInvoiceBusy(null);
    }
  }

  const currentSortOrder = mine?.plan?.sortOrder ?? 0;
  const midtermTotal = (midtermQuote?.workspaces ?? []).reduce(
    (sum, item) =>
      midtermSelection.includes(item.workspaceId) ? sum + item.amount : sum,
    0,
  );
  // The active term length of the current plan. A subscription is only
  // "current" when both the plan *and* the purchased term match, so buying
  // «اکو سه‌ماهه» while «اکو یک‌ماهه» is active still shows the normal
  // «پرداخت و فعال‌سازی» button.
  const activeRequest = [...(mine?.requests ?? [])]
    .filter(
      (request) =>
        request.status === 'ACTIVE' &&
        request.planId === currentPlanId &&
        request.startsAt,
    )
    .sort((a, b) =>
      (b.startsAt ?? '').localeCompare(a.startsAt ?? ''),
    )[0];
  const activeMonths = activeRequest?.months ?? 1;
  const pendingPlanId =
    mine?.requests.find(
      (request) =>
        request.status === 'PENDING' && request.payment?.status !== 'PAID',
    )?.planId ?? null;
  const pendingActivations =
    mine?.requests.filter(
      (request) =>
        request.status === 'PENDING' && request.payment?.status === 'PAID',
    ) ?? [];

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">اشتراک من</h2>
        <p className="text-sm text-muted">
          در تب «اشتراک فعلی» فقط بسته‌ی فعال و «بسته‌های مدیریت کسب‌وکار»ی که
          خریده‌اید نمایش داده می‌شود. تمدید، ارتقا و خرید افزودنی در تب «تمدید
          و ارتقا» و فاکتورها در تب «تاریخچه پرداخت‌ها» قرار دارند.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="بخش‌های اشتراک"
        className="indeed-panel flex flex-wrap gap-1 p-1"
      >
        {PAGE_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm',
              tab === item.key
                ? 'bg-brand text-white'
                : 'text-muted hover:bg-brand-light/60 hover:text-brand',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {tab === 'current' ? (
        <div className="flex flex-col gap-5">
      {!mine?.plan ? (
        <p className="indeed-panel p-4 text-sm text-muted">
          هنوز اشتراک فعالی ندارید؛ از تب «تمدید و ارتقا» یک بسته انتخاب کنید.
        </p>
      ) : null}
      {mine?.plan ? (
        <div className="indeed-panel flex items-center gap-3 p-4">
          <span className="vintage-avatar flex size-10 items-center justify-center">
            <Crown className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted">اشتراک فعال شما</p>
            <p className="text-lg font-extrabold text-ink">{mine.plan.name}</p>
            <p className="mt-1 text-xs text-muted">
              دوره‌ی فعلی:{' '}
              {isFreePlan(mine.plan)
                ? 'یک‌ماهه (تمدید خودکار)'
                : activeMonths > 1
                ? `${activeMonths.toLocaleString('fa-IR')} ماهه`
                : 'یک‌ماهه'}
            </p>
            {mine.planExpiresAt ? (
              <p className="mt-1 text-xs text-muted">
                اعتبار تا {faDateTime(mine.planExpiresAt)}
              </p>
            ) : null}
            {mine.planStartedAt ? (
              <p className="mt-0.5 text-[11px] text-muted">
                شروع دوره: {faDateTime(mine.planStartedAt)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="indeed-panel p-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Receipt className="size-4 text-brand" aria-hidden />
          بسته‌های مدیریت کسب‌وکار خریداری‌شده
        </h3>
        {mine?.businessPackages && mine.businessPackages.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {mine.businessPackages.map((item) => (
              <div
                key={item.workspaceId}
                className="flex items-start gap-3 rounded-xl border border-[var(--vintage-border)] bg-white/60 p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <Store className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-ink">{item.name}</p>
                  <p className="mt-0.5 text-sm text-muted">{item.label}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                    <CalendarDays className="size-3.5" aria-hidden />
                    فعال تا {faDateTime(item.paidUntil)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-6 text-muted">
            هنوز «بسته مدیریت کسب‌وکار» فعالی ندارید. برای خرید آن به تب «تمدید و
            ارتقا» بروید.
          </p>
        )}
      </div>

      {pendingActivations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {pendingActivations.map((request) => (
            <div
              key={request.id}
              className="indeed-panel border-amber-300 bg-amber-50/60 p-4 dark:border-amber-800/60 dark:bg-amber-950/20"
            >
              <p className="text-sm font-extrabold text-amber-900 dark:text-amber-100">
                اشتراک «{request.plan?.name ?? '—'}»
                {request.months && request.months > 1
                  ? ` (${request.months} ماهه)`
                  : ' (یک‌ماهه)'}{' '}
                پرداخت شد و آماده‌ی فعال‌سازی است.
              </p>
              <p className="mt-1 text-xs leading-6 text-amber-800 dark:text-amber-200">
                با فعال‌سازی این اشتراک، مانده‌ی روزهای اشتراک فعلی شما
                {mine?.plan?.name ? ` («${mine.plan.name}»)` : ''} از بین می‌رود.
              </p>
              <button
                type="button"
                onClick={() => void activatePending(request.id)}
                disabled={busyPlanId === request.id}
                className="indeed-btn indeed-btn-primary mt-3 py-2 text-xs disabled:opacity-60"
              >
                {busyPlanId === request.id
                  ? 'در حال فعال‌سازی...'
                  : `فعال‌سازی اشتراک ${request.plan?.name ?? ''}`}
              </button>
            </div>
          ))}
        </div>
      ) : null}
        </div>
      ) : null}

      {tab === 'plans' ? (
        <div className="flex flex-col gap-5">
      <div className="indeed-panel flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm font-bold text-ink">دوره‌ی پرداخت:</span>
        {PLAN_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setMonths(period)}
            aria-pressed={months === period}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-bold transition',
              months === period
                ? 'border-brand bg-brand text-white'
                : 'border-[var(--vintage-border)] text-muted hover:border-brand hover:text-brand',
            )}
          >
            {PLAN_PERIOD_LABELS[period]}
            {period > 1 ? <span className="ms-1 font-normal">({period} ماه)</span> : null}
          </button>
        ))}
        <span className="w-full text-xs text-muted sm:w-auto">
          دوره‌های سه‌ماهه، شش‌ماهه و یک‌ساله بر پایه‌ی قیمت ماهانه و با تخفیف
          محاسبه می‌شوند. پلن رایگان همیشه ماهانه است و در پایان هر ماه
          به‌صورت خودکار تمدید می‌شود.
        </span>
      </div>

      {midtermQuote?.allowed && midtermQuote.workspaces.length > 0 ? (
        <div className="indeed-panel p-4">
          <h3 className="text-sm font-extrabold text-ink">
            افزودن «بسته مدیریت کسب‌وکار» به دوره‌ی فعلی
          </h3>
          <p className="mt-1 text-xs leading-6 text-muted">
            بدون خرید دوره‌ی جدید؛ مبلغ بر اساس روزهای باقی‌مانده تا{' '}
            {faDateTime(midtermQuote.expiresAt)} محاسبه می‌شود و مدیریت دقیقاً با
            اشتراک فعلی شما منقضی می‌شود. تاریخ دقیق انقضا پیش از پرداخت همین
            است.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {midtermQuote.workspaces.map((item) => {
              const checked = midtermSelection.includes(item.workspaceId);
              return (
                <label
                  key={item.workspaceId}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs',
                    checked
                      ? 'border-brand bg-brand-light/50'
                      : 'border-transparent hover:border-brand/40',
                    !item.available && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    disabled={!item.available}
                    onChange={() =>
                      setMidtermSelection((prev) =>
                        checked
                          ? prev.filter((id) => id !== item.workspaceId)
                          : prev.length >= midtermQuote.maxBusinesses
                            ? prev
                            : [...prev, item.workspaceId],
                      )
                    }
                  />
                  <span className="flex-1">
                    <span className="font-bold text-ink">{item.name}</span>
                    <span className="text-muted"> · {item.industryLabel}</span>
                    {item.currentPaidUntil ? (
                      <span className="block text-[10px] text-emerald-700">
                        تمدید مدیریت فعلی تا{' '}
                        {faDateTime(item.currentPaidUntil)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-bold text-brand">
                    {item.available ? faPrice(item.amount) : 'بدون تعرفه'}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink">
              جمع افزودنی: {faPrice(midtermTotal)}
            </span>
            <button
              type="button"
              onClick={() => void startAddon()}
              disabled={addonBusy || midtermSelection.length === 0}
              className="indeed-btn indeed-btn-primary py-2 text-xs disabled:opacity-60"
            >
              {addonBusy
                ? 'در حال انتقال به درگاه...'
                : 'پرداخت و فعال‌سازی افزودنی'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const free = isFreePlan(plan);
          const isCurrent = plan.id === currentPlanId;
          const isCurrentTerm = isCurrent && (free || activeMonths === months);
          const isPending = plan.id === pendingPlanId;
          // «ارتقا فقط»: a lower plan cannot be bought from a higher one.
          const isDowngrade = !isCurrent && plan.sortOrder < currentSortOrder;
          const amount = planPriceForMonths(plan, free ? 1 : months);
          const discount = free ? 0 : planDiscountPercent(plan, months);
          const busy = busyPlanId === plan.id;
          const quote = free ? undefined : quotes[plan.id];
          const selectedWorkspaces = free
            ? []
            : (addonSelection[plan.id] ?? []);
          const addonTotal = selectedWorkspaces.reduce(
            (sum, id) =>
              sum +
              (quote?.workspaces.find((item) => item.workspaceId === id)
                ?.amount ?? 0),
            0,
          );
          const totalAmount = amount + addonTotal;
          return (
            <div
              key={plan.id}
              className={cn(
                'indeed-panel flex flex-col p-4 sm:p-5',
                isCurrentTerm && 'border-brand ring-2 ring-brand/30',
                isDowngrade && 'opacity-60',
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
                {faPrice(totalAmount)}
              </p>
              {!free && months > 1 && plan.price > 0 ? (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>
                    {plan.price.toLocaleString('fa-IR')} تومان × {months} ماه
                  </span>
                  {discount > 0 ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 font-bold text-green-700">
                      {discount.toLocaleString('fa-IR')}٪ تخفیف
                    </span>
                  ) : null}
                </p>
              ) : null}
              {free ? (
                <p className="mt-1 text-xs text-muted">
                  دوره‌ی ماهانه؛ تمدید خودکار
                </p>
              ) : null}

              {free ? (
                <p className="mt-3 rounded-lg border border-dashed border-[var(--vintage-border)] p-3 text-xs text-muted">
                  برای خرید «بسته مدیریت کسب‌وکار» ابتدا به اکو یا پلاس ارتقا
                  دهید؛ اشتراک رایگان این افزودنی را نمی‌پذیرد.
                </p>
              ) : quote && quote.workspaces.length > 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-[var(--vintage-border)] p-3">
                  <p className="text-xs font-bold text-ink">
                    افزودن «بسته مدیریت کسب‌وکار» (روزشمار، تا{' '}
                    {faDateTime(quote.expiresAt)})
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    مدیریت برای مدت باقی‌مانده‌ی همین دوره محاسبه می‌شود و با
                    اشتراک منقضی می‌گردد؛ اطلاعات پس از انقضا باقی می‌ماند و
                    فقط کنترل آن متوقف می‌شود.
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {quote.workspaces.map((item) => {
                      const checked = selectedWorkspaces.includes(
                        item.workspaceId,
                      );
                      return (
                        <label
                          key={item.workspaceId}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs',
                            checked
                              ? 'border-brand bg-brand-light/50'
                              : 'border-transparent hover:border-brand/40',
                            !item.available && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={checked}
                            disabled={!item.available}
                            onChange={() =>
                              toggleAddonWorkspace(
                                plan.id,
                                item.workspaceId,
                                quote.maxBusinesses,
                              )
                            }
                          />
                          <span className="flex-1">
                            <span className="font-bold text-ink">
                              {item.name}
                            </span>
                            <span className="text-muted">
                              {' '}
                              · {item.industryLabel}
                            </span>
                            {item.currentPaidUntil ? (
                              <span className="block text-[10px] text-emerald-700">
                                تمدید مدیریت فعلی تا{' '}
                                {faDateTime(item.currentPaidUntil)}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 font-bold text-brand">
                            {item.available
                              ? faPrice(item.amount)
                              : 'بدون تعرفه'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedWorkspaces.length > 0 ? (
                    <p className="mt-2 text-[11px] font-bold text-ink">
                      جمع افزودنی:{' '}
                      {faPrice(addonTotal)} برای {selectedWorkspaces.length}{' '}
                      کسب‌وکار
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted">
                      بدون انتخاب، فقط اشتراک {plan.name} خریداری می‌شود.
                    </p>
                  )}
                </div>
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
                disabled={isCurrentTerm || isPending || isDowngrade || busy}
                onClick={() => startPlan(plan)}
                className={cn(
                  'indeed-btn mt-4 w-full py-2 text-xs sm:mt-5 sm:text-sm',
                  isCurrentTerm
                    ? 'indeed-btn-secondary'
                    : 'indeed-btn-primary',
                  (isCurrentTerm || isPending || isDowngrade) &&
                    'opacity-70',
                )}
              >
                {isCurrentTerm
                  ? 'اشتراک فعلی شما'
                  : isDowngrade
                    ? 'امکان تنزل اشتراک وجود ندارد'
                    : isPending
                      ? 'در انتظار تأیید مدیر'
                      : busy
                        ? totalAmount >= 1000
                          ? 'در حال انتقال به درگاه...'
                          : 'در حال ثبت...'
                        : totalAmount >= 1000
                          ? 'پرداخت و فعال‌سازی'
                          : 'درخواست اشتراک'}
              </button>
            </div>
          );
        })}
      </div>
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="flex flex-col gap-5">
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
            {mine.payments.map((payment: SubscriptionPayment) => {
              const addonOnly = (payment.months ?? 1) === 0;
              const addonNames = (payment.businessPackages ?? [])
                .map((item) => item.businessName || item.label)
                .filter(Boolean);
              return (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm"
                >
                  <span className="text-base font-extrabold text-ink">
                    {addonOnly
                      ? 'بسته مدیریت کسب‌وکار'
                      : payment.plan?.name ?? '—'}
                  </span>
                  <span className="text-sm font-bold text-brand">
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
                    {addonOnly
                      ? ' · افزودنی میان‌دوره‌ای'
                      : payment.months && payment.months > 1
                        ? ` · دوره‌ی ${payment.months} ماهه`
                        : ''}
                    {payment.refId ? ` · کد رهگیری: ${payment.refId}` : ''}
                  </span>
                  {payment.withBusinessPackage ? (
                    <span className="flex w-full flex-wrap items-center gap-1.5 text-xs text-muted">
                      شامل «بسته مدیریت کسب‌وکار»
                      {addonNames.length > 0
                        ? addonNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 font-bold text-brand"
                            >
                              <Store className="size-3" aria-hidden />
                              {name}
                            </span>
                          ))
                        : null}
                    </span>
                  ) : null}
                  {payment.failureReason ? (
                    <span className="w-full text-xs text-red-600">
                      {payment.failureReason}
                    </span>
                  ) : null}
                  {payment.status === 'PAID' ? (
                    <button
                      type="button"
                      onClick={() => void downloadInvoice(payment.id)}
                      disabled={invoiceBusy === payment.id}
                      className="indeed-btn indeed-btn-secondary flex items-center gap-1.5 py-1.5 text-[11px] disabled:opacity-60"
                    >
                      <Download className="size-3.5" aria-hidden />
                      {invoiceBusy === payment.id
                        ? 'در حال دریافت...'
                        : 'دانلود فاکتور'}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {(!mine ||
        (mine.requests.length === 0 && (mine.payments?.length ?? 0) === 0)) ? (
        <p className="indeed-panel p-4 text-sm text-muted">
          هنوز پرداخت یا درخواستی ثبت نشده است.
        </p>
      ) : null}
        </div>
      ) : null}
    </div>
  );
}
