'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, Crown, Sparkles } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api, type SubscriptionPlan } from '@/lib/api';
import { cn } from '@/lib/utils';

function faPrice(value: number): string {
  if (!value) return 'رایگان';
  return `${value.toLocaleString('fa-IR')} تومان`;
}

/**
 * Public «لیست خدمات» page: the active subscription plans and what each one
 * unlocks. Purchase/upgrade happens from the dashboard, so both calls to action
 * send the visitor to `/login`.
 */
export default function ServicesPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SubscriptionPlan[]>('/subscriptions/plans')
      .then(setPlans)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="container-page py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-brand-light px-4 py-1.5 text-xs font-bold text-brand">
            <Sparkles className="size-4" aria-hidden />
            خدمات و اشتراک‌ها
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-ink">لیست خدمات شمالی کارت</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
            با انتخاب هر اشتراک، سهمیه‌ی ساخت بیولینک و کارت ویزیت و امکانات نمایش
            بیشتر می‌شود. برای فعال‌سازی، وارد حساب خود شوید.
          </p>
        </div>

        {error ? (
          <p className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : null}

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="indeed-panel h-64 animate-pulse bg-soft" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.price > 0;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'indeed-panel flex flex-col p-6',
                    featured && 'border-brand',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-ink">{plan.name}</h2>
                    <Crown
                      className={cn('size-5', featured ? 'text-brand' : 'text-muted')}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-brand">
                    {faPrice(plan.price)}
                  </p>
                  {plan.description ? (
                    <p className="mt-3 text-sm leading-7 text-muted">{plan.description}</p>
                  ) : null}

                  <ul className="mt-4 flex flex-col gap-2 text-sm text-ink">
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-brand" aria-hidden />
                      تا {plan.maxBiolinks.toLocaleString('fa-IR')} بیولینک
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-brand" aria-hidden />
                      تا {plan.maxBusinessCards.toLocaleString('fa-IR')} کارت ویزیت
                    </li>
                    {plan.showSocialLinks ? (
                      <li className="flex items-center gap-2">
                        <BadgeCheck className="size-4 text-brand" aria-hidden />
                        نمایش شبکه‌های اجتماعی و وب‌سایت
                      </li>
                    ) : null}
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/login?next=/dashboard/subscriptions"
                    className={cn(
                      'indeed-btn mt-6 w-full',
                      featured ? 'indeed-btn-primary' : 'indeed-btn-secondary',
                    )}
                  >
                    انتخاب این اشتراک
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
