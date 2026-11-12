import type { SubscriptionPlan } from '@/lib/api';

/**
 * Billable subscription terms. Mirrors `PLAN_PERIOD_MONTHS` in the API
 * (`apps/api/src/common/plans.ts`): the monthly price is the base and each
 * longer term applies the admin's discount percentage for that term.
 */
export const PLAN_PERIODS = [1, 3, 6, 12] as const;
export type PlanPeriodMonths = (typeof PLAN_PERIODS)[number];

export const PLAN_PERIOD_LABELS: Record<PlanPeriodMonths, string> = {
  1: 'ماهانه',
  3: 'سه‌ماهه',
  6: 'شش‌ماهه',
  12: 'یک‌ساله',
};

type DiscountedPlan = Pick<
  SubscriptionPlan,
  'price' | 'discount3Months' | 'discount6Months' | 'discount12Months'
>;

/** The discount percentage the admin set for a term (0 when none). */
export function planDiscountPercent(plan: DiscountedPlan, months: number): number {
  const raw =
    months === 3
      ? plan.discount3Months
      : months === 6
        ? plan.discount6Months
        : months === 12
          ? plan.discount12Months
          : 0;
  const value = Number(raw ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

/** Price of a plan for `months`, after the term discount. */
export function planPriceForMonths(plan: DiscountedPlan, months: number): number {
  const full = plan.price * months;
  const discount = planDiscountPercent(plan, months);
  return Math.round((full * (100 - discount)) / 100);
}
