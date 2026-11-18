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
  | 'approval'
  | 'custom';

export const ONBOARDING_STEP_KINDS: OnboardingStepKind[] = [
  'welcome',
  'identity',
  'business',
  'details',
  'documents',
  'plan',
  'approval',
  'custom',
];

/**
 * Kinds whose completion is a manual tick by the user (no account data to
 * derive it from): the informational welcome screen and admin-added steps.
 */
export const MANUAL_STEP_KINDS: OnboardingStepKind[] = ['welcome', 'custom'];

export interface OnboardingStepDef {
  /** stable id; built-in steps use their `kind` as the id. */
  id: string;
  kind: OnboardingStepKind;
  title: string;
  description: string;
  /** where the user continues this step (dashboard route). */
  href?: string;
  /** disabled steps stay configured but are hidden from users. */
  enabled: boolean;
  /**
   * Optional steps never block the wizard: the user may skip them and still
   * reach the final step. The admin can mark any step optional.
   */
  optional?: boolean;
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
    title: 'انتخاب طرح اشتراک و مدیریت کسب‌وکار',
    description:
      'طرح مناسب خود را انتخاب کنید. اگر دسته‌بندی کسب‌وکارتان بسته‌ی «مدیریت کسب‌وکار» داشته باشد، همان‌جا می‌توانید آن را هم به همین پرداخت اضافه کنید.',
    enabled: true,
  },
  {
    id: 'approval',
    kind: 'approval',
    title: 'تبریک! ثبت‌نام شما کامل شد',
    description:
      'همه‌ی مراحل را انجام دادید. کسب‌وکار شما پس از تأیید مدیر در صفحه‌ی مشاغل و دایرکتوری نمایش داده می‌شود. برای تسویه‌ی هزینه‌ها به کیف پول بروید.',
    enabled: true,
  },
];

/** One step as returned to the dashboard, with its computed state. */
export interface OnboardingStepState extends OnboardingStepDef {
  done: boolean;
  /** human-readable hint for the current state (Persian). */
  hint: string;
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
