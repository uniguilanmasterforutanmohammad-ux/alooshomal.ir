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

/**
 * Every field a user can fill in when building a biolink / business card.
 * Admins toggle these per plan: a field hidden on the plan is masked on the
 * public page for every item its owner owns. The labels are shared by the
 * admin «اشتراک‌ها» panel so the toggles match the builder exactly.
 */
export const PLAN_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'fullName', label: 'نام و نام خانوادگی' },
  { key: 'jobTitle', label: 'عنوان شغلی' },
  { key: 'company', label: 'شرکت' },
  { key: 'bio', label: 'درباره من' },
  { key: 'phone', label: 'تلفن همراه / ثابت' },
  { key: 'email', label: 'ایمیل' },
  { key: 'website', label: 'وب‌سایت' },
  { key: 'address', label: 'آدرس' },
  { key: 'avatarUrl', label: 'تصویر پروفایل' },
  { key: 'logoUrl', label: 'لوگو' },
  { key: 'linkedin', label: 'لینکدین' },
  { key: 'instagram', label: 'اینستاگرام' },
  { key: 'telegram', label: 'تلگرام' },
  { key: 'twitter', label: 'ایکس (توییتر)' },
  { key: 'whatsapp', label: 'واتساپ' },
];

export const PLAN_FIELD_KEYS: string[] = PLAN_FIELDS.map((field) => field.key);

/**
 * Fields the free plan masks: the social/web links plus the e-mail. Kept as the
 * fallback for plans that predate the per-field `hiddenFields` list, so the old
 * `showSocialLinks` flag keeps behaving the same (only now it also hides the
 * e-mail, matching the current free-plan rules).
 */
export const DEFAULT_HIDDEN_LINK_FIELDS = [
  'website',
  'email',
  'linkedin',
  'instagram',
  'telegram',
  'twitter',
  'whatsapp',
];

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  description: string;
  price: number;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
  hiddenFields: string[];
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
    hiddenFields: DEFAULT_HIDDEN_LINK_FIELDS,
    features: [
      'ساخت یک کارت ویزیت و یک بیولینک',
      'عدم نمایش لینک‌ها، شبکه‌های اجتماعی، وب‌سایت و ایمیل',
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
    hiddenFields: [],
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
    hiddenFields: [],
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
  hiddenFields: string[];
}

/** Resolve the effective hidden-field list for a plan (legacy-aware). */
export function hiddenFieldsFrom(plan: {
  showSocialLinks: boolean;
  hiddenFields?: string[] | null;
} | null | undefined): string[] {
  if (!plan) return DEFAULT_HIDDEN_LINK_FIELDS;
  // The column is non-null after the backfill; a missing value falls back to
  // the legacy `showSocialLinks` semantics for safety.
  if (Array.isArray(plan.hiddenFields)) return plan.hiddenFields;
  return plan.showSocialLinks ? [] : DEFAULT_HIDDEN_LINK_FIELDS;
}

/** Null out every hidden field present on an item (public-visibility mask). */
export function applyHiddenFields<T extends Record<string, unknown>>(
  item: T,
  hidden: string[],
): T {
  if (!hidden || hidden.length === 0) return item;
  const clone: Record<string, unknown> = { ...item };
  for (const key of hidden) {
    if (key in clone) clone[key] = null;
  }
  return clone as T;
}

export function planLimitsFrom(plan: {
  name: string;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
  hiddenFields?: string[] | null;
} | null | undefined): PlanLimits {
  if (!plan) {
    return {
      name: DEFAULT_PLAN.name,
      maxBiolinks: DEFAULT_PLAN.maxBiolinks,
      maxBusinessCards: DEFAULT_PLAN.maxBusinessCards,
      showSocialLinks: DEFAULT_PLAN.showSocialLinks,
      hiddenFields: DEFAULT_PLAN.hiddenFields,
    };
  }
  return {
    name: plan.name,
    maxBiolinks: plan.maxBiolinks,
    maxBusinessCards: plan.maxBusinessCards,
    showSocialLinks: plan.showSocialLinks,
    hiddenFields: hiddenFieldsFrom(plan),
  };
}
