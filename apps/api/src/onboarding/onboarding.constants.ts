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
  | 'identity'
  | 'business'
  | 'details'
  | 'documents'
  | 'plan'
  | 'approval'
  | 'custom';

export const ONBOARDING_STEP_KINDS: OnboardingStepKind[] = [
  'identity',
  'business',
  'details',
  'documents',
  'plan',
  'approval',
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
  /** disabled steps stay configured but are hidden from users. */
  enabled: boolean;
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStepDef[] = [
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
      'برای کسب‌وکار خود یک نام انتخاب کنید؛ مثلاً «نمایشگاه اتومبیل تنکابن».',
    href: '/dashboard/business-cards/new',
    enabled: true,
  },
  {
    id: 'details',
    kind: 'details',
    title: 'تکمیل سایر مشخصات',
    description:
      'شبکه‌های اجتماعی و همه‌ی اطلاعات لازم برای صفحه مشاغل، کارت ویزیت و بیولینک را کامل کنید.',
    href: '/dashboard/business-cards',
    enabled: true,
  },
  {
    id: 'documents',
    kind: 'documents',
    title: 'ارسال مدارک و جواز کسب‌وکار',
    description:
      'مدارک و جواز کسب‌وکار را ارسال کنید تا پس از بررسی، تیک آبی دریافت کنید.',
    href: '/dashboard/profile',
    enabled: true,
  },
  {
    id: 'plan',
    kind: 'plan',
    title: 'انتخاب طرح اشتراک',
    description:
      'طرح رایگان (نمایش محدود + تیک سفید)، اکو (نمایش کامل + تیک آبی، یک کسب‌وکار) یا طرح حرفه‌ای (اکو + سه کسب‌وکار) را انتخاب کنید.',
    href: '/dashboard/subscriptions',
    enabled: true,
  },
  {
    id: 'approval',
    kind: 'approval',
    title: 'منتظر تأیید مدیر',
    description:
      'پس از تأیید مدیر، کسب‌وکار شما در صفحه مشاغل و دایرکتوری نمایش داده می‌شود.',
    href: '/dashboard/business-cards',
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
