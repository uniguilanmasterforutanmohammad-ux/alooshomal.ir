/**
 * Built-in subscription plans.
 *
 * Plans are stored in the `subscription_plans` table so an admin can edit their
 * limits from the panel, but the project ships with these three defaults:
 *
 *  - free  → 1 biolink + 1 business card, social/web links hidden
 *  - eco   → 1 biolink + 1 business card, every field visible
 *  - plus  → 3 biolinks + 3 business cards, every Eco feature
 */
export const PLAN_KEYS = ['free', 'eco', 'plus'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  description: string;
  price: number;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
  features: string[];
  sortOrder: number;
}

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    key: 'free',
    name: 'رایگان',
    description: 'برای شروع؛ یک کارت ویزیت و یک بیولینک با فیلدهای محدود.',
    price: 0,
    maxBiolinks: 1,
    maxBusinessCards: 1,
    showSocialLinks: false,
    features: [
      'ساخت یک کارت ویزیت و یک بیولینک',
      'عدم نمایش لینک‌ها، شبکه‌های اجتماعی و وب‌سایت',
    ],
    sortOrder: 1,
  },
  {
    key: 'eco',
    name: 'اکو',
    description: 'نمایش کامل تمامی فیلدها بدون محدودیت.',
    price: 0,
    maxBiolinks: 1,
    maxBusinessCards: 1,
    showSocialLinks: true,
    features: [
      'ساخت یک کارت ویزیت و یک بیولینک',
      'نمایش تمامی فیلدها بدون محدودیت',
    ],
    sortOrder: 2,
  },
  {
    key: 'plus',
    name: 'بلاس',
    description: 'برای حرفه‌ای‌ها؛ ظرفیت بیشتر و تمام امکانات اکو.',
    price: 0,
    maxBiolinks: 3,
    maxBusinessCards: 3,
    showSocialLinks: true,
    features: [
      'ساخت سه کارت ویزیت و سه بیولینک',
      'دارای تمامی امکانات اشتراک اکو',
    ],
    sortOrder: 3,
  },
];

export const FREE_PLAN_KEY: PlanKey = 'free';

/** Fallback limits used when a user has no plan row yet (brand new account). */
export const DEFAULT_PLAN: PlanDefinition = DEFAULT_PLANS[0];

export interface PlanLimits {
  name: string;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
}

export function planLimitsFrom(plan: {
  name: string;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
} | null | undefined): PlanLimits {
  if (!plan) {
    return {
      name: DEFAULT_PLAN.name,
      maxBiolinks: DEFAULT_PLAN.maxBiolinks,
      maxBusinessCards: DEFAULT_PLAN.maxBusinessCards,
      showSocialLinks: DEFAULT_PLAN.showSocialLinks,
    };
  }
  return {
    name: plan.name,
    maxBiolinks: plan.maxBiolinks,
    maxBusinessCards: plan.maxBusinessCards,
    showSocialLinks: plan.showSocialLinks,
  };
}
