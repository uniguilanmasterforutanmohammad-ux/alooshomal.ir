'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, Crown, ShieldCheck, Sparkles } from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { api, type SubscriptionPlan } from '@/lib/api';

interface PricingService {
  key: string;
  label: string;
  group: string;
  description: string;
  price: number;
}

function faPrice(value: number): string {
  if (!value) return 'رایگان';
  return `${value.toLocaleString('fa-IR')} تومان`;
}

/**
 * Public «تعرفه‌ها» page: the price of every inquiry service the admin has
 * switched on and priced, plus the active subscription plans. Disabled
 * services are filtered out server-side (`GET /zohal/pricing`), so turning a
 * service off also removes its tariff row here.
 */
export default function PricingPage() {
  const [services, setServices] = useState<PricingService[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<PricingService[]>('/zohal/pricing'),
      api.get<SubscriptionPlan[]>('/subscriptions/plans'),
    ])
      .then(([serviceList, planList]) => {
        setServices(serviceList);
        setPlans(planList);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'خطا در بارگذاری تعرفه‌ها',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const byGroup = new Map<string, PricingService[]>();
    for (const service of services) {
      const list = byGroup.get(service.group) ?? [];
      list.push(service);
      byGroup.set(service.group, list);
    }
    return Array.from(byGroup.entries());
  }, [services]);

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
            هزینه‌ی استعلام‌ها و اشتراک‌ها در کیف پول شما جمع می‌شود و تا
            سررسید فقط یک‌بار پرداخت می‌کنید. تعرفه‌ی سرویس‌هایی که مدیر غیرفعال
            کرده است در این صفحه نمایش داده نمی‌شود.
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
                className="indeed-panel h-40 animate-pulse bg-soft"
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-10">
            {groups.length > 0 ? (
              <section className="flex flex-col gap-4">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
                  <ShieldCheck className="size-5 text-brand" aria-hidden />
                  استعلام‌های هویتی و بانکی
                </h2>
                {groups.map(([group, items]) => (
                  <div key={group} className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-muted">{group}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((service) => (
                        <div
                          key={service.key}
                          className="indeed-panel flex flex-col p-5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-extrabold text-ink">
                              {service.label}
                            </h4>
                            <BadgeCheck
                              className="size-5 shrink-0 text-brand"
                              aria-hidden
                            />
                          </div>
                          {service.description ? (
                            <p className="mt-2 text-sm leading-6 text-muted">
                              {service.description}
                            </p>
                          ) : null}
                          <p className="mt-4 text-xl font-extrabold text-brand">
                            {faPrice(service.price)}
                          </p>
                          <Link
                            href="/login?next=/dashboard/profile"
                            className="indeed-btn indeed-btn-secondary mt-4 w-full py-2 text-sm"
                          >
                            درخواست استعلام
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
                <Crown className="size-5 text-brand" aria-hidden />
                اشتراک‌ها
              </h2>
              {plans.length === 0 ? (
                <p className="text-sm text-muted">
                  در حال حاضر اشتراک فعالی برای فروش وجود ندارد.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={
                        plan.price > 0
                          ? 'indeed-panel flex flex-col border-brand p-5'
                          : 'indeed-panel flex flex-col p-5'
                      }
                    >
                      <h3 className="text-lg font-extrabold text-ink">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-2xl font-extrabold text-brand">
                        {faPrice(plan.price)}
                      </p>
                      {plan.description ? (
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {plan.description}
                        </p>
                      ) : null}
                      <ul className="mt-3 flex flex-col gap-1.5 text-xs text-ink">
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
                        href="/login?next=/dashboard/subscriptions"
                        className="indeed-btn indeed-btn-primary mt-4 w-full py-2 text-sm"
                      >
                        انتخاب و پرداخت
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
