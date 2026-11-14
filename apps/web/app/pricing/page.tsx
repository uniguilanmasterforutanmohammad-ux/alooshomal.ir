'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarRange,
  Check,
  Crown,
  PackageOpen,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { api, type SubscriptionPlan } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  PLAN_PERIODS,
  PLAN_PERIOD_LABELS,
  planDiscountPercent,
  planPriceForMonths,
  type PlanPeriodMonths,
} from '@/lib/plan-periods';
import { cn } from '@/lib/utils';

type PricingSource = 'SETTING' | 'ZOHAL' | 'PLAN' | 'FEED_PACKAGE';

interface PricingItem {
  key: string;
  label: string;
  group: string;
  description?: string;
  price: number;
  source: PricingSource;
  active?: boolean;
}

interface PricingPayload {
  items: PricingItem[];
  settlementDays: number;
}

const GROUP_ICONS: Record<string, typeof ReceiptText> = {
  'استعلام‌های هویتی': ShieldCheck,
  'فیدها': PackageOpen,
  'بازاریابی و تبلیغات': ReceiptText,
};

function faPrice(value: number): string {
  if (!value) return 'رایگان';
  return `${value.toLocaleString('fa-IR')} تومان`;
}

/**
 * Public «تعرفه‌ها» page. The subscription catalogue comes first and can be
 * switched between the monthly, three-, six- and twelve-month terms. Below it,
 * the page mirrors every active row the admin edits in «اشتراک‌ها ← قیمت
 * خدمات» so visitors see exactly the same amounts without a second source of
 * truth.
 */
export default function PricingPage() {
  const { token, hydrated } = useAuth();
  const signedIn = hydrated && Boolean(token);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [months, setMonths] = useState<PlanPeriodMonths>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signed-in visitors land straight on the purchase screen; guests are sent
  // through login first and come back to the same destination afterwards.
  const subscriptionsHref = signedIn
    ? '/dashboard/subscriptions'
    : '/login?next=/dashboard/subscriptions';
  const inquiryHref = signedIn
    ? '/dashboard/onboarding'
    : '/login?next=/dashboard/onboarding';

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [planList, priceList] = await Promise.all([
        api.get<SubscriptionPlan[]>('/subscriptions/plans'),
        api.get<PricingPayload>('/pricing'),
      ]);
      setPlans(planList);
      setPricing(priceList.items);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'خطا در بارگذاری تعرفه‌ها',
      );
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  // Refresh silently when the visitor returns to this tab, so a price the
  // admin has just changed in another tab is picked up without a reload.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  // Plans are rendered by the dedicated subscription section above; the rest
  // of the admin catalogue is grouped exactly as the admin sees it.
  const groups = useMemo(() => {
    const byGroup = new Map<string, PricingItem[]>();
    for (const item of pricing) {
      if (item.source === 'PLAN') continue;
      const list = byGroup.get(item.group) ?? [];
      list.push(item);
      byGroup.set(item.group, list);
    }
    return Array.from(byGroup.entries());
  }, [pricing]);

  return (
    <>
      <Header />
      <main className="container-page py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-brand-light px-4 py-1.5 text-xs font-bold text-brand">
            <Sparkles className="size-4" aria-hidden />
            تعرفه خدمات
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-ink">
            تعرفه‌های شمالی کارت
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
            اشتراک مناسب خود را انتخاب کنید؛ مبالغ دوره‌های سه‌ماهه، شش‌ماهه و
            یک‌ساله با تخفیف محاسبه می‌شوند.
          </p>
        </div>

        {error ? (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="indeed-panel h-52 animate-pulse bg-soft"
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-14">
            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
                    <Crown className="size-5 text-brand" aria-hidden />
                    اشتراک‌ها
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    ابتدا دوره‌ی پرداخت را انتخاب کنید؛ مبلغ هر بسته بلافاصله
                    به‌روز می‌شود.
                  </p>
                </div>
                <Link
                  href={subscriptionsHref}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  <Crown className="size-4" aria-hidden />
                  خرید اشتراک
                </Link>
              </div>

              <div className="indeed-panel flex flex-wrap items-center gap-2 p-3">
                <span className="flex items-center gap-1.5 pe-1 text-xs font-bold text-ink">
                  <CalendarRange className="size-4 text-brand" aria-hidden />
                  دوره‌ی پرداخت:
                </span>
                {PLAN_PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setMonths(period)}
                    aria-pressed={months === period}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-bold transition',
                      months === period
                        ? 'border-brand bg-brand text-white shadow-sm'
                        : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand hover:text-brand',
                    )}
                  >
                    {PLAN_PERIOD_LABELS[period]}
                    {period > 1 ? (
                      <span className="ms-1 font-normal">({period} ماه)</span>
                    ) : null}
                  </button>
                ))}
              </div>

              {plans.length === 0 ? (
                <p className="text-sm text-muted">
                  در حال حاضر اشتراک فعالی برای فروش وجود ندارد.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const amount = planPriceForMonths(plan, months);
                    const discount = planDiscountPercent(plan, months);
                    const fullPrice = plan.price * months;
                    const monthlyEquivalent =
                      months > 1 && plan.price > 0
                        ? Math.round(amount / months)
                        : null;
                    const hasDiscount = months > 1 && plan.price > 0 && discount > 0;
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          'indeed-panel flex flex-col p-5',
                          plan.price > 0 && 'border-brand/70',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-extrabold text-ink">
                            {plan.name}
                          </h3>
                          {hasDiscount ? (
                            <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              {discount.toLocaleString('fa-IR')}٪ تخفیف
                            </span>
                          ) : null}
                        </div>
                        {plan.description ? (
                          <p className="mt-2 text-sm leading-6 text-muted">
                            {plan.description}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-end gap-2">
                          <p className="text-2xl font-extrabold text-brand">
                            {faPrice(amount)}
                          </p>
                          {hasDiscount ? (
                            <p className="pb-1 text-xs text-muted line-through">
                              {fullPrice.toLocaleString('fa-IR')} تومان
                            </p>
                          ) : null}
                        </div>
                        {months > 1 && plan.price > 0 ? (
                          <p className="mt-1 text-[11px] leading-5 text-muted">
                            {plan.price.toLocaleString('fa-IR')} تومان ×{' '}
                            {months.toLocaleString('fa-IR')} ماه
                            {monthlyEquivalent
                              ? ` · معادل ${monthlyEquivalent.toLocaleString('fa-IR')} تومان در ماه`
                              : ''}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] leading-5 text-muted">
                            پرداخت ماهانه، بدون تعهد بلندمدت
                          </p>
                        )}

                        <ul className="mt-4 flex flex-1 flex-col gap-2 text-xs text-ink">
                          <li className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-brand" aria-hidden />
                            تا {plan.maxBiolinks.toLocaleString('fa-IR')} بیولینک
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-brand" aria-hidden />
                            تا {plan.maxBusinessCards.toLocaleString('fa-IR')} کارت
                            ویزیت
                          </li>
                          {plan.features.slice(0, 4).map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-1.5"
                            >
                              <Check
                                className="mt-0.5 size-3.5 shrink-0 text-brand"
                                aria-hidden
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Link
                          href={subscriptionsHref}
                          className="indeed-btn indeed-btn-primary mt-5 w-full py-2 text-sm"
                        >
                          {plan.price === 0 ? 'شروع رایگان' : 'انتخاب و پرداخت'}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
                  <ReceiptText className="size-5 text-brand" aria-hidden />
                  تعرفه‌ی سایر خدمات
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-7 text-muted">
                  مبالغ سایر امکانات و خدمات شمالی کارت
                </p>
              </div>

              {groups.length === 0 ? (
                <p className="text-sm text-muted">
                  در حال حاضر تعرفه‌ی خدماتی برای نمایش وجود ندارد.
                </p>
              ) : (
                groups.map(([group, items]) => {
                  const GroupIcon = GROUP_ICONS[group] ?? ReceiptText;
                  return (
                    <div key={group} className="flex flex-col gap-3">
                      <h3 className="flex items-center gap-1.5 text-sm font-bold text-muted">
                        <GroupIcon className="size-4 text-brand" aria-hidden />
                        {group}
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => (
                          <div
                            key={item.key}
                            className="indeed-panel flex flex-col p-5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-extrabold text-ink">
                                {item.label}
                              </h4>
                              {item.source === 'ZOHAL' ? (
                                <ShieldCheck
                                  className="size-5 shrink-0 text-brand"
                                  aria-hidden
                                />
                              ) : item.source === 'FEED_PACKAGE' ? (
                                <PackageOpen
                                  className="size-5 shrink-0 text-brand"
                                  aria-hidden
                                />
                              ) : (
                                <BadgeCheck
                                  className="size-5 shrink-0 text-brand"
                                  aria-hidden
                                />
                              )}
                            </div>
                            {item.description ? (
                              <p className="mt-2 text-sm leading-6 text-muted">
                                {item.description}
                              </p>
                            ) : null}
                            <p className="mt-auto pt-4 text-xl font-extrabold text-brand">
                              {faPrice(item.price)}
                            </p>
                            {item.source === 'ZOHAL' ? (
                              <Link
                                href={inquiryHref}
                                className="indeed-btn indeed-btn-secondary mt-4 w-full py-2 text-sm"
                              >
                                درخواست استعلام
                              </Link>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
