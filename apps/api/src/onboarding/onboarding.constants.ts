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
    id: 'identity',
    kind: 'identity',
    title: 'استعلام هویت و تطبیق شماره موبایل',
    description:
      'کد ملی و تاریخ تولد را وارد کنید تا شماره موبایل با کد ملی تطبیق داده شود و هویت شما استعلام شود (تیک سفید).',
    enabled: true,
  },
  {
    id: 'business',
    kind: 'business',
    title: 'عنوان کسب‌وکار',
    description:
      'فقط اطلاعات ضروری را وارد کنید: عنوان کسب‌وکار، نام مدیر، شهر، دسته‌بندی، موبایل و آدرس. بقیه‌ی مشخصات را بعداً از پنل کامل می‌کنید.',
    href: '/dashboard/business-cards/new',
    enabled: true,
  },
  {
    id: 'documents',
    kind: 'documents',
    title: 'ارسال مدارک و جواز کسب‌وکار',
    description:
      'مدارک و جواز کسب‌وکار را آپلود کنید تا پس از بررسی، تیک آبی دریافت کنید. این مرحله اختیاری است و می‌توانید بعداً هم انجام دهید.',
    href: '/dashboard/profile',
    enabled: true,
    optional: true,
  },
  {
    id: 'plan',
    kind: 'plan',
    title: 'انتخاب طرح اشتراک',
    description:
      'طرح مناسب خود را همین‌جا انتخاب کنید؛ رایگان، اکو یا حرفه‌ای.',
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
  /** id of the first unfinished step (the one the wizard expands). */
  currentStepId: string | null;
  /** the identity data collected by the Zohal inquiry, if any. */
  identity: OnboardingIdentityState;
  /** persisted log of every identity inquiry attempt (newest first). */
  history: OnboardingIdentityLog[];
  /** files uploaded for the «مدارک» step (newest first). */
  documents: OnboardingDocument[];
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
