/**
 * «شروع آسان» — the step-by-step onboarding wizard shown at the top of the
 * user dashboard.
 *
 * The step list is stored as one JSON `Setting` so the admin can add, remove
 * and reorder steps from the panel without a deploy. Built-in steps carry a
 * `kind` that maps to a completion rule computed from the user's account data;
 * admin-added steps use `kind: 'custom'` and are ticked off by the user.
 */
export const ONBOARDING_STEPS_SETTING_KEY = 'onboardingSteps';

/**
 * Per-user, per-step form data collected by a `module` step (e.g. the inputs
 * of an api.ir/Zohal inquiry the admin placed in the wizard). Stored as a
 * setting key so the wizard can show what the user already entered without a
 * schema migration.
 */
export const ONBOARDING_STEP_DATA_PREFIX = 'onboardingStepData:';

/**
 * Per-user onboarding cart. When the user actually uses a priced module step
 * (submits its form or completes it), the module is added here so the final
 * invoice can charge for it in the single checkout. Stored as a JSON setting.
 */
export const ONBOARDING_CART_PREFIX = 'onboardingCart:';

/**
 * Per-user, per-step result of a paid module inquiry (api.ir/Zohal) that ran
 * after the onboarding invoice was settled. Stored as a JSON setting.
 */
export const ONBOARDING_MODULE_RESULT_PREFIX = 'onboardingModuleResult:';

/**
 * Sentinel completion row written when the user presses «پایان مراحل» on the
 * final step. It is not a real wizard step; it only records that the user has
 * dismissed onboarding so the dashboard can stop advertising «شروع آسان».
 */
export const ONBOARDING_FINISHED_STEP_ID = '__onboarding_finished__';

export type OnboardingStepKind =
  | 'welcome'
  | 'identity'
  | 'business'
  | 'details'
  | 'documents'
  | 'plan'
  | 'management'
  | 'invoice'
  | 'approval'
  | 'module'
  | 'custom';

export const ONBOARDING_STEP_KINDS: OnboardingStepKind[] = [
  'welcome',
  'identity',
  'business',
  'details',
  'documents',
  'plan',
  'management',
  'invoice',
  'approval',
  'module',
  'custom',
];

/**
 * Kinds whose completion is a manual tick by the user (no account data to
 * derive it from): the informational welcome screen and admin-added steps.
 */
export const MANUAL_STEP_KINDS: OnboardingStepKind[] = [
  'welcome',
  'module',
  'custom',
];

export interface OnboardingStepDef {
  /** stable id; built-in steps use their `kind` as the id. */
  id: string;
  kind: OnboardingStepKind;
  title: string;
  description: string;
  /** where the user continues this step (dashboard route). */
  href?: string;
  /**
   * For `kind: 'module'` steps: the catalog key of the module/product this
   * step is bound to (`plan:<id>`, `management:<key>`, `zohal:<key>`,
   * `apiir:<key>`, `biolink`, `businessCard`).
   */
  moduleKey?: string;
  /** disabled steps stay configured but are hidden from users. */
  enabled: boolean;
  /**
   * Optional steps never block the wizard: the user may skip them and still
   * reach the final step. The admin can mark any step optional.
   */
  optional?: boolean;
}

/** One input the user must fill for a module step. */
export interface OnboardingModuleField {
  name: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'file';
  placeholder?: string;
}

/** Module/product details attached to a `module` step for the wizard form. */
export interface OnboardingModuleInfo {
  key: string;
  type: 'zohal' | 'apiir' | 'plan' | 'management' | 'biolink' | 'businessCard';
  label: string;
  description: string;
  href: string;
  price: number;
  fields: OnboardingModuleField[];
}

/** One priced module the user opted into, shown in the wizard's cart. */
export interface OnboardingCartItem {
  stepId: string;
  moduleKey: string;
  type: OnboardingModuleInfo['type'];
  label: string;
  /** Toman; snapshotted from the module catalog when the step was used. */
  amount: number;
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    id: 'welcome',
    kind: 'welcome',
    title: 'به شمالی‌کارت خوش آمدید',
    description:
      'آماده‌اید کسب‌وکارتان را ثبت کنیم؟ در چند مرحله‌ی ساده از استعلام هویت تا ساخت کارت ویزیت و صفحه‌ی مشاغل همراهتان هستیم. برای شروع دکمه‌ی زیر را بزنید.',
    enabled: true,
  },
  {
    id: 'business',
    kind: 'business',
    title: 'ساخت کسب‌وکار',
    description:
      'عنوان کسب‌وکار، دسته‌بندی و اطلاعات اصلی را وارد کنید. در این مرحله فقط کسب‌وکار ساخته می‌شود؛ کارت ویزیت و بیولینک را بعداً از پنل تکمیل می‌کنید.',
    enabled: true,
  },
  {
    id: 'identity',
    kind: 'identity',
    title: 'استعلام هویت، تطبیق موبایل و جواز',
    description:
      'کد ملی و تاریخ تولد را وارد کنید تا موبایل با کد ملی تطبیق و هویت شما استعلام شود (تیک سفید). اگر تیک «استعلام جواز کسب» را بزنید، همان پرداخت شامل جواز هم می‌شود و تیک آبی می‌گیرید.',
    enabled: true,
  },
  {
    id: 'plan',
    kind: 'plan',
    title: 'خرید اشتراک اکو یا بلاس',
    description:
      'طرح اکو یا بلاس و دوره‌ی پرداخت را انتخاب کنید. مبلغ این مرحله فقط به صورتحساب نهایی اضافه می‌شود و پرداخت در پایان انجام می‌گیرد.',
    enabled: true,
  },
  {
    id: 'management',
    kind: 'management',
    title: 'بسته مدیریت کسب‌وکار',
    description:
      'اگر دسته‌بندی کسب‌وکار شما بسته‌ی «مدیریت کسب‌وکار» دارد، آن را انتخاب کنید. این مرحله اختیاری است و می‌توانید بدون آن ادامه دهید.',
    enabled: true,
    optional: true,
  },
  {
    id: 'invoice',
    kind: 'invoice',
    title: 'صورتحساب و پرداخت نهایی',
    description:
      'همه‌ی موارد انتخابی (اشتراک، مدیریت کسب‌وکار و استعلام هویت) یک‌جا نمایش داده می‌شوند و با یک پرداخت آنلاین تسویه می‌شوند.',
    enabled: true,
  },
  {
    id: 'approval',
    kind: 'approval',
    title: 'نتیجه استعلام و پایان',
    description:
      'نتیجه‌ی استعلام هویت اینجا نمایش داده می‌شود: در صورت موفقیت تبریک؛ در صورت خطا می‌توانید اطلاعات را اصلاح کنید و دوباره استعلام بگیرید.',
    enabled: true,
  },
];

/** One step as returned to the dashboard, with its computed state. */
export interface OnboardingStepState extends OnboardingStepDef {
  done: boolean;
  /** human-readable hint for the current state (Persian). */
  hint: string;
  /** For `module` steps: the catalog entry (with its form fields). */
  module?: OnboardingModuleInfo | null;
  /** Values the user already submitted for this module step. */
  data?: Record<string, unknown> | null;
  /** Result of the paid inquiry that ran for this module step, if any. */
  result?: unknown | null;
}

export interface OnboardingProgressPayload {
  steps: OnboardingStepState[];
  completed: number;
  total: number;
  /** True once the user pressed «پایان مراحل» on the final step. */
  finished: boolean;
  /** id of the first unfinished step (the one the wizard expands). */
  currentStepId: string | null;
  /** the identity data collected by the Zohal inquiry, if any. */
  identity: OnboardingIdentityState;
  /** persisted log of every identity inquiry attempt (newest first). */
  history: OnboardingIdentityLog[];
  /** files uploaded for the «مدارک» step (newest first). */
  documents: OnboardingDocument[];
  /** Draft captured by the business step before the card exists. */
  business: OnboardingBusinessState | null;
  /** Priced modules the user used; charged on the final invoice. */
  cart: OnboardingCartItem[];
  /** Sum of {@link cart} amounts in Toman. */
  cartTotal: number;
  /** True when a paid checkout still has module inquiries to deliver. */
  pendingModuleDelivery: boolean;
}

/** Snapshot of the «شروع آسان» business draft. */
export interface OnboardingBusinessState {
  id: string;
  name: string;
  industryKey: string;
  industryLabel: string;
  cityId: string | null;
  businessId: string | null;
  mobile: string | null;
  additionalMobiles: string[];
  address: string | null;
  fullName: string | null;
}

/** One uploaded document attached to the account for the blue-tick review. */
export interface OnboardingDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

/** Snapshot of the identity fields stored on the user (may be partially set). */
export interface OnboardingIdentityState {
  nationalCode: string | null;
  birthDate: string | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  phoneMatched: boolean;
  verified: boolean;
  businessLicenseVerified: boolean;
}

/** One row of the persisted inquiry history shown under the wizard. */
export interface OnboardingIdentityLog {
  id: string;
  kind: 'PHONE_MATCH' | 'IDENTITY_INQUIRY';
  status: 'SUCCESS' | 'FAILED' | 'CACHED';
  nationalCode: string | null;
  birthDate: string | null;
  phone: string | null;
  matched: boolean | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  message: string | null;
  amount: number;
  createdAt: Date;
}
