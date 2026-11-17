/**
 * Single source of truth for the modular business panel.
 *
 * A *module* is one independently switchable capability (accommodations,
 * reservations, CRM, business cards, biolinks, …). An *industry package* is a
 * curated bundle of modules for one trade (daily rental, retail, …). The web
 * panel is rendered from this registry, so adding a capability is a code-only
 * change:
 *
 *   1. add a definition below,
 *   2. add it to one or more industry packages,
 *   3. gate its API controller with `@RequireModule('<key>')`,
 *   4. add its dashboard route (the nav metadata below drives the UI).
 *
 * Per-workspace enablement is persisted in `business_module_activations`.
 * Existing features (business cards, biolinks) are registered here too, but
 * keep `enforced: false` for backward compatibility — their global admin
 * feature flags remain the enforcement point.
 */

export interface BusinessModuleNav {
  href: string;
  label: string;
  /** lucide-react icon name used by the web panel. */
  icon: string;
  exact?: boolean;
}

export interface BusinessModuleDefinition {
  key: string;
  label: string;
  description: string;
  group: string;
  icon: string;
  /** enabled when the workspace has no explicit activation row. */
  defaultEnabled: boolean;
  /**
   * Whether the module must be bought (admin-priced) before it can be turned
   * on. The two identity modules (business card + biolink) are free defaults;
   * everything else is a paid «مدیریت کسب‌وکار» the user purchases.
   */
  billable: boolean;
  /** whether the API enforces the per-workspace activation. */
  enforced: boolean;
  /** module keys that must be enabled first. */
  dependsOn?: string[];
  /** global admin feature flag that can stop the module for everyone. */
  featureFlag?: string;
  nav?: BusinessModuleNav;
  /** public route prefixes owned by this module (for the visibility switch). */
  publicRoutes?: string[];
  /** short bullet list shown on the module card. */
  capabilities: string[];
}

export interface IndustryPackageDefinition {
  key: string;
  label: string;
  description: string;
  /** every module this package can offer. */
  modules: string[];
  /** modules enabled when a workspace adopts the package. */
  defaultModules: string[];
}

export const BUSINESS_MODULES: BusinessModuleDefinition[] = [
  {
    key: 'businessCards',
    label: 'کارت ویزیت دیجیتال',
    description:
      'کارت ویزیت عمومی کسب‌وکار با اطلاعات تماس، گالری و لینک‌های اجتماعی.',
    group: 'هویت و حضور آنلاین',
    icon: 'BadgeCheck',
    defaultEnabled: true,
    billable: false,
    enforced: true,
    featureFlag: 'allowBusinessCardCreation',
    nav: {
      href: '/dashboard/business-cards',
      label: 'کارت‌های ویزیت',
      icon: 'BadgeCheck',
    },
    publicRoutes: ['/business-cards', '/categories', '/business'],
    capabilities: ['پروفایل عمومی کسب‌وکار', 'گالری تصاویر', 'لینک‌های تماس'],
  },
  {
    key: 'biolinks',
    label: 'بیولینک',
    description:
      'صفحه‌ی لینک‌های شخصی/کسب‌وکار برای اینستاگرام و شبکه‌های اجتماعی.',
    group: 'هویت و حضور آنلاین',
    icon: 'IdCard',
    defaultEnabled: true,
    billable: false,
    enforced: true,
    featureFlag: 'allowBiolinkCreation',
    nav: { href: '/dashboard/biolinks', label: 'بیولینک‌ها', icon: 'IdCard' },
    publicRoutes: ['/biolinks'],
    capabilities: ['صفحه‌ی لینک عمومی', 'قالب‌های ظاهری', 'اتصال به کارت ویزیت'],
  },
  {
    key: 'feeds',
    label: 'پست و محتوای اجتماعی',
    description: 'انتشار پست، تصویر و محتوای کوتاه در فید کاربران.',
    group: 'محتوا و بازاریابی',
    icon: 'ImagePlus',
    defaultEnabled: false,
    billable: true,
    enforced: false,
    featureFlag: 'featureFeedPosts',
    nav: { href: '/dashboard/feeds', label: 'پست‌های من', icon: 'ImagePlus' },
    publicRoutes: ['/feeds'],
    capabilities: ['انتشار پست', 'موضوع و هشتگ', 'تعامل کاربران'],
  },
  {
    key: 'accommodationRental',
    label: 'اقامتگاه‌ها و واحدهای اجاره',
    description:
      'ثبت اقامتگاه، واحدها، عکس‌ها، امکانات و صفحه‌ی عمومی رزرو.',
    group: 'اقامت و سفر',
    icon: 'House',
    defaultEnabled: false,
    billable: true,
    enforced: true,
    featureFlag: 'featureAccommodationRental',
    nav: {
      href: '/dashboard/business/accommodations',
      label: 'اقامتگاه‌ها',
      icon: 'House',
    },
    publicRoutes: ['/stay'],
    capabilities: [
      'ثبت چند اقامتگاه',
      'عکس و امکانات',
      'صفحه‌ی عمومی و فرم درخواست رزرو',
    ],
  },
  {
    key: 'accommodationReservations',
    label: 'رزروها و تقویم',
    description:
      'مدیریت درخواست‌های رزرو، تأیید/رد، تقویم مسدودی و وضعیت اقامت.',
    group: 'اقامت و سفر',
    icon: 'CalendarCheck',
    defaultEnabled: false,
    billable: true,
    enforced: true,
    dependsOn: ['accommodationRental'],
    nav: {
      href: '/dashboard/business/bookings',
      label: 'رزروها و تقویم',
      icon: 'CalendarCheck',
    },
    capabilities: ['صف درخواست رزرو', 'تغییر وضعیت', 'مسدودکردن تاریخ‌ها'],
  },
  {
    key: 'accommodationChannels',
    label: 'کانال‌های رزرو',
    description:
      'مدیریت سایت‌ها و پلتفرم‌های واسط (بوکینگ، جاباما، اینستاگرام و …).',
    group: 'اقامت و سفر',
    icon: 'Globe',
    defaultEnabled: false,
    billable: true,
    enforced: true,
    dependsOn: ['accommodationRental'],
    nav: {
      href: '/dashboard/business/channels',
      label: 'کانال‌های رزرو',
      icon: 'Globe',
    },
    capabilities: ['فهرست پلتفرم‌ها', 'حساب و لینک هر کانال', 'نمایش در صفحه‌ی عمومی'],
  },
  {
    key: 'crm',
    label: 'مدیریت مشتریان (CRM)',
    description:
      'دفترچه‌ی مشتریان مشترک: تماس، برچسب، یادداشت و تاریخچه‌ی تعامل.',
    group: 'مشتریان',
    icon: 'Users',
    defaultEnabled: false,
    billable: true,
    enforced: true,
    featureFlag: 'featureCrm',
    nav: {
      href: '/dashboard/business/customers',
      label: 'مشتریان',
      icon: 'Users',
    },
    capabilities: ['پروفایل مشتری', 'برچسب و یادداشت', 'تاریخچه‌ی رزرو و تماس'],
  },
];

export const INDUSTRY_PACKAGES: IndustryPackageDefinition[] = [
  {
    key: 'generalBusiness',
    label: 'کسب‌وکار عمومی',
    description: 'بسته‌ی پایه برای هر کسب‌وکاری که هنوز صنف مشخصی انتخاب نکرده است.',
    modules: ['businessCards', 'biolinks', 'feeds', 'crm'],
    defaultModules: ['businessCards', 'biolinks'],
  },
  {
    key: 'dailyRental',
    label: 'اقامت و سفر — اجاره روزانه',
    description:
      'برای مالکان اقامتگاه، ویلا، آپارتمان و سوئیت که رزرو روزانه می‌پذیرند.',
    modules: [
      'accommodationRental',
      'accommodationReservations',
      'accommodationChannels',
      'crm',
      'businessCards',
      'biolinks',
    ],
    defaultModules: ['businessCards', 'biolinks'],
  },
  {
    key: 'foodService',
    label: 'رستوران و کافه',
    description: 'بسته‌ی آماده برای رستوران، کافه و سفارش غذا (ماژول‌های تخصصی در آینده).',
    modules: ['businessCards', 'biolinks', 'feeds', 'crm'],
    defaultModules: ['businessCards', 'biolinks'],
  },
  {
    key: 'retail',
    label: 'فروشگاه و خرده‌فروشی',
    description: 'بسته‌ی آماده برای فروشگاه‌ها (ماژول‌های فروش در آینده).',
    modules: ['businessCards', 'biolinks', 'feeds', 'crm'],
    defaultModules: ['businessCards', 'biolinks'],
  },
  {
    key: 'professionalServices',
    label: 'خدمات تخصصی',
    description: 'برای مشاوران، پزشکان، وکلا و سایر خدمات حرفه‌ای.',
    modules: ['businessCards', 'biolinks', 'feeds', 'crm'],
    defaultModules: ['businessCards', 'biolinks'],
  },
];

const MODULE_BY_KEY = new Map(BUSINESS_MODULES.map((item) => [item.key, item]));
const INDUSTRY_BY_KEY = new Map(INDUSTRY_PACKAGES.map((item) => [item.key, item]));

export function getBusinessModule(key: string): BusinessModuleDefinition | undefined {
  return MODULE_BY_KEY.get(key);
}

export function getIndustryPackage(
  key: string,
): IndustryPackageDefinition | undefined {
  return INDUSTRY_BY_KEY.get(key);
}

/**
 * Expand a set of module keys with their dependencies, preserving registry
 * order. Used both when adopting an industry package and when enabling one
 * module from the panel.
 */
export function withDependencies(keys: Iterable<string>): string[] {
  const wanted = new Set<string>();
  const visit = (key: string) => {
    if (wanted.has(key)) return;
    const definition = getBusinessModule(key);
    if (!definition) return;
    for (const dependency of definition.dependsOn ?? []) visit(dependency);
    wanted.add(key);
  };
  for (const key of keys) visit(key);
  return BUSINESS_MODULES.filter((item) => wanted.has(item.key)).map(
    (item) => item.key,
  );
}

/** Modules (and dependencies) enabled by default for an industry package. */
export function defaultModulesForIndustry(industryKey: string): string[] {
  const industry = getIndustryPackage(industryKey);
  return withDependencies(industry?.defaultModules ?? []);
}
