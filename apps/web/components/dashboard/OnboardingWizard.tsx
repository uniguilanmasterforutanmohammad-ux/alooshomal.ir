'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Crown,
  FileText,
  FileCheck2,
  History,
  ListChecks,
  Loader2,
  Lock,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';

import {
  api,
  type MySubscriptions,
  type SubscriptionCheckout,
  type SubscriptionPlan,
} from '@/lib/api';
import { isoToJalali } from '@/lib/jalali';
import { planPriceForMonths } from '@/lib/plan-periods';
import { toast } from '@/lib/toast';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { OnboardingBusinessForm } from '@/components/dashboard/OnboardingBusinessForm';
import { cn } from '@/lib/utils';

type StepKind =
  | 'welcome'
  | 'identity'
  | 'business'
  | 'details'
  | 'documents'
  | 'plan'
  | 'approval'
  | 'custom';

interface OnboardingStep {
  id: string;
  kind: StepKind;
  title: string;
  description: string;
  href?: string;
  enabled: boolean;
  optional?: boolean;
  done: boolean;
  hint: string;
}

interface OnboardingPayload {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  currentStepId: string | null;
  identity: IdentityState;
  history: IdentityLog[];
  documents: OnboardingDocument[];
}

interface OnboardingDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

interface IdentityState {
  nationalCode: string | null;
  birthDate: string | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  phoneMatched: boolean;
  verified: boolean;
}

interface IdentityLog {
  id: string;
  kind: 'PHONE_MATCH' | 'IDENTITY_INQUIRY';
  status: 'SUCCESS' | 'FAILED' | 'CACHED';
  nationalCode: string | null;
  birthDate: string | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  message: string | null;
  amount: number;
  createdAt: string;
}

interface WalletPayload {
  balance: number;
  dueAt: string | null;
}

interface ZohalPrice {
  key: string;
  label?: string;
  group?: string;
  price?: number;
}

const LOG_KIND_LABEL: Record<IdentityLog['kind'], string> = {
  PHONE_MATCH: 'تطبیق شماره موبایل',
  IDENTITY_INQUIRY: 'استعلام هویت',
};

const LOG_STATUS_LABEL: Record<IdentityLog['status'], string> = {
  SUCCESS: 'موفق',
  FAILED: 'ناموفق',
  CACHED: 'از قبل ثبت‌شده',
};

const LOG_STATUS_CLASS: Record<IdentityLog['status'], string> = {
  SUCCESS:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  FAILED: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
  CACHED: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
};

const STEP_ICON: Record<StepKind, typeof Sparkles> = {
  welcome: PartyPopper,
  identity: BadgeCheck,
  business: Building2,
  details: ListChecks,
  documents: FileCheck2,
  plan: Crown,
  approval: Clock,
  custom: Sparkles,
};

const MANUAL_KINDS: StepKind[] = ['welcome', 'custom'];

function isManual(step: OnboardingStep): boolean {
  return MANUAL_KINDS.includes(step.kind);
}

function faPrice(amount: number): string {
  if (amount <= 0) return 'رایگان';
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  }
  return `${(bytes / 1024 / 1024).toLocaleString('fa-IR', {
    maximumFractionDigits: 1,
  })} مگابایت`;
}

/**
 * «شروع آسان» — the admin-configurable, step-by-step onboarding wizard that
 * sits at the top of the user dashboard. One step is shown at a time inside a
 * single card, in the admin-defined order, with a «مرحله بعد» button. The
 * welcome screen is a normal step (manual tick) so the admin can edit it.
 */
export function OnboardingWizard() {
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [pricing, setPricing] = useState<ZohalPrice[]>([]);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [nationalCode, setNationalCode] = useState('');
  const [birthIso, setBirthIso] = useState('');
  const [paying, setPaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [myPlanId, setMyPlanId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const jumpedToPending = useRef(false);

  const load = useCallback(async () => {
    try {
      const [progress, walletPayload] = await Promise.all([
        api.get<OnboardingPayload>('/onboarding/me'),
        api.get<WalletPayload>('/wallet/me').catch(() => null),
      ]);
      setPayload(progress);
      setWallet(walletPayload);
      setNationalCode((current) => current || progress.identity?.nationalCode || '');
      // Land on the first unfinished step exactly once, so later refreshes
      // (e.g. after an inquiry) never yank the user off the step they're on.
      if (!jumpedToPending.current) {
        jumpedToPending.current = true;
        const pending = progress.steps.findIndex((entry) => !entry.done);
        if (pending > 0) setIndex(pending);
      }
    } catch {
      setPayload(null);
    }
  }, []);

  useEffect(() => {
    void load();
    void api
      .get<ZohalPrice[]>('/zohal/pricing')
      .then((list) => setPricing(list))
      .catch(() => setPricing([]));
    void api
      .get<SubscriptionPlan[]>('/subscriptions/plans')
      .then((list) => setPlans(list))
      .catch(() => setPlans([]));
    void api
      .get<MySubscriptions>('/subscriptions/me')
      .then((mine) => setMyPlanId(mine.plan?.id ?? null))
      .catch(() => setMyPlanId(null));
  }, [load]);

  // The identity gateway callback returns here with `?identity=success|failed`.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('identity');
    if (!status) return;
    if (status === 'success') {
      toast.success('پرداخت انجام شد و استعلام هویت شما تکمیل شد.');
      void load();
    } else {
      toast.error(
        'پرداخت یا استعلام هویت کامل نشد؛ اگر مبلغ کسر شده، دوباره روی «پرداخت و استعلام» بزنید.',
      );
    }
    params.delete('identity');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, [load]);

  async function completeIdentity() {
    if (!/^\d{10}$/.test(nationalCode.trim())) {
      toast.error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    const jalali = isoToJalali(birthIso);
    if (!jalali) {
      toast.error('برای استعلام هویت، تاریخ تولد را انتخاب کنید.');
      return;
    }
    const birthDate = `${jalali.year}/${String(jalali.month).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`;
    setIdentityBusy(true);
    try {
      const result = await api.post<{
        url?: string | null;
        paid?: boolean;
        alreadyVerified?: boolean;
      }>('/profile/identity/checkout', {
        nationalCode: nationalCode.trim(),
        birthDate,
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.alreadyVerified) {
        toast.success('هویت شما قبلاً استعلام شده است.');
        await load();
        return;
      }
      await api.post('/profile/identity/verify', {});
      toast.success('پرداخت انجام شد و هویت شما استعلام شد (تیک سفید).');
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setIdentityBusy(false);
    }
  }

  /** Continue from an already-matched phone straight into the paid inquiry. */
  async function continueIdentityInquiry() {
    setIdentityBusy(true);
    try {
      const result = await api.post<{
        url?: string | null;
        paid?: boolean;
        alreadyVerified?: boolean;
      }>('/profile/identity/checkout', {});
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.alreadyVerified) {
        toast.success('هویت شما قبلاً استعلام شده بود؛ هزینه‌ی مجدد ثبت نشد.');
        await load();
        return;
      }
      await api.post('/profile/identity/verify', {});
      toast.success('پرداخت انجام شد و استعلام هویت تکمیل شد (تیک سفید).');
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setIdentityBusy(false);
    }
  }

  async function payInvoice() {
    setPaying(true);
    try {
      const result = await api.post<{ url?: string }>('/wallet/checkout', {
        returnTo: '/dashboard/onboarding',
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      toast.error('ساخت پرداخت در درگاه ناموفق بود.');
    } catch {
      /* api layer surfaces the error */
    } finally {
      setPaying(false);
    }
  }

  async function uploadDocument(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api.upload<{
        url: string;
        size: number;
        contentType: string;
      }>('/uploads/document', form);
      const next = await api.post<OnboardingPayload>('/onboarding/documents', {
        url: uploaded.url,
        name: file.name,
        size: uploaded.size,
        contentType: uploaded.contentType,
      });
      setPayload(next);
      toast.success('مدرک با موفقیت آپلود شد.');
    } catch {
      /* api layer surfaces the error */
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(id: string) {
    try {
      const next = await api.delete<OnboardingPayload>(
        `/onboarding/documents/${id}`,
      );
      setPayload(next);
    } catch {
      /* api layer surfaces the error */
    }
  }

  async function choosePlan(plan: SubscriptionPlan) {
    setBusyPlanId(plan.id);
    try {
      const amount = planPriceForMonths(plan, 1);
      if (amount >= 1000) {
        const checkout = await api.post<SubscriptionCheckout>(
          `/subscriptions/${plan.id}/checkout`,
          { months: 1 },
        );
        if (checkout?.wallet) {
          toast.success('اشتراک فعال شد و هزینه به کیف پول اضافه شد.');
          setMyPlanId(plan.id);
          await load();
          return;
        }
        if (checkout?.url) {
          window.location.href = checkout.url;
          return;
        }
        toast.error('لینک پرداخت از درگاه دریافت نشد.');
        return;
      }
      await api.post('/subscriptions/request', { planId: plan.id, months: 1 });
      toast.success('درخواست اشتراک ثبت شد و در انتظار تأیید مدیر است.');
      setMyPlanId(plan.id);
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusyPlanId(null);
    }
  }

  async function toggleManualStep(step: OnboardingStep, thenNext = false) {
    setBusyStepId(step.id);
    try {
      const next = step.done
        ? await api.delete<OnboardingPayload>(`/onboarding/steps/${step.id}/complete`)
        : await api.post<OnboardingPayload>(`/onboarding/steps/${step.id}/complete`, {});
      setPayload(next);
      if (thenNext && !step.done) goTo(safeIndex + 1);
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusyStepId(null);
    }
  }

  if (!payload || payload.total === 0) return null;

  const steps = payload.steps;
  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex];
  const Icon = STEP_ICON[step.kind] ?? Sparkles;
  const debt = wallet && wallet.balance < 0 ? Math.abs(wallet.balance) : 0;
  const identityServices = pricing.filter(
    (item) =>
      item.key === 'shahkar' || item.key === 'national_identity_inquiry',
  );
  const identityTotal = identityServices.reduce(
    (total, item) => total + (item.price ?? 0),
    0,
  );
  const percent =
    payload.total > 0 ? Math.round((payload.completed / payload.total) * 100) : 0;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === steps.length - 1;
  const isOptional = step.optional === true;
  const stepUnlocked = step.done || isOptional;

  /** A step can be opened once every earlier required step is complete. */
  function canEnter(position: number): boolean {
    return steps
      .slice(0, position)
      .every((entry) => entry.done || entry.optional === true);
  }

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(next, steps.length - 1)));
  }
  function nextStep() {
    if (!stepUnlocked) return;
    goTo(safeIndex + 1);
  }
  function prevStep() {
    goTo(safeIndex - 1);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] shadow-[0_24px_70px_-40px_rgba(58,40,28,0.55)] dark:shadow-[0_24px_70px_-40px_rgba(0,0,0,0.8)]">
      {/* progress header */}
      <header className="relative overflow-hidden border-b border-[var(--vintage-border)] bg-gradient-to-l from-brand/15 via-brand-light/70 to-[var(--vintage-surface)] p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-16 size-48 rounded-full bg-brand/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-base font-extrabold text-ink">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Sparkles className="size-4" aria-hidden />
            </span>
            شروع آسان
          </span>
          <span className="rounded-full bg-[var(--vintage-surface)] px-3 py-1 text-xs font-bold text-brand shadow-sm ring-1 ring-brand/10">
            مرحله‌ی {(safeIndex + 1).toLocaleString('fa-IR')} از{' '}
            {steps.length.toLocaleString('fa-IR')}
          </span>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[var(--vintage-surface)] ring-1 ring-brand/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand to-brand-hover transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* step dots */}
        <div className="relative mt-4 flex items-center gap-2">
          {steps.map((entry, position) => {
            const active = position === safeIndex;
            const unlocked = canEnter(position);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => unlocked && goTo(position)}
                disabled={!unlocked}
                title={entry.title}
                aria-label={entry.title}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'group flex flex-1 items-center gap-1.5 rounded-full border px-1.5 py-1 text-[10px] font-bold transition',
                  active
                    ? 'border-brand bg-brand text-white shadow-sm'
                    : entry.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : unlocked
                        ? 'border-[var(--vintage-border)] bg-[var(--vintage-surface)] text-muted hover:border-brand/50 hover:text-brand'
                        : 'cursor-not-allowed border-[var(--vintage-border)] bg-[var(--vintage-paper)] text-muted/60',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                    active
                      ? 'bg-white/20'
                      : entry.done
                        ? 'bg-emerald-100 dark:bg-emerald-900/50'
                        : 'bg-[var(--vintage-paper)]',
                  )}
                >
                  {entry.done ? (
                    <Check className="size-3" aria-hidden />
                  ) : unlocked ? (
                    (position + 1).toLocaleString('fa-IR')
                  ) : (
                    <Lock className="size-2.5" aria-hidden />
                  )}
                </span>
                <span className="hidden truncate sm:inline">{entry.title}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* the single step card */}
      <div className="bg-gradient-to-b from-[var(--vintage-surface)] to-[var(--vintage-paper)]/30 p-5 sm:p-6">
        <div
          className={cn(
            'mx-auto flex flex-col gap-4',
            step.kind === 'business'
              ? 'max-w-4xl'
              : 'max-w-2xl',
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-extrabold shadow-sm',
                step.done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-brand/20 bg-brand-light text-brand',
              )}
            >
              {step.done ? <Check className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold leading-7 text-ink">{step.title}</h2>
                {step.done ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    تکمیل شد
                  </span>
                ) : isOptional ? (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    اختیاری
                  </span>
                ) : (
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                    {step.hint}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-7 text-muted">{step.description}</p>
            </div>
          </div>

          <div className="h-px bg-[var(--vintage-border)]" />

          {!canEnter(safeIndex) ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              برای ورود به این مرحله، ابتدا مراحل قبلی را کامل کنید.
            </div>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* step-specific body                                               */}
          {/* ---------------------------------------------------------------- */}

          {step.kind === 'welcome' ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60 p-4">
                <p className="text-xs font-bold text-muted">در این مسیر چه‌کار می‌کنیم؟</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-6 text-muted">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" aria-hidden />
                    استعلام هویت و دریافت تیک سفید
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" aria-hidden />
                    ساخت کارت ویزیت و صفحه‌ی مشاغل
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" aria-hidden />
                    انتخاب طرح اشتراک و تأیید مدیر
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => void toggleManualStep(step, true)}
                disabled={busyStepId === step.id}
                className="indeed-btn indeed-btn-primary self-start"
              >
                {busyStepId === step.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowLeft className="size-4" aria-hidden />
                )}
                {step.done ? 'ادامه' : 'شروع کنیم'}
              </button>
            </div>
          ) : null}

          {step.kind === 'identity' ? (
            <div className="flex flex-col gap-3">
              {payload.identity?.verified ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <b className="flex items-center gap-1.5">
                    <BadgeCheck className="size-4" aria-hidden />
                    هویت شما تأیید شد؛ تیک سفید دریافت کردید.
                  </b>
                  <p className="mt-1">
                    {[payload.identity.firstName, payload.identity.lastName]
                      .filter(Boolean)
                      .join(' ') || '—'}
                    {payload.identity.fatherName
                      ? ` — نام پدر: ${payload.identity.fatherName}`
                      : ''}
                    {payload.identity.nationalCode
                      ? ` — کد ملی: ${payload.identity.nationalCode}`
                      : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                    این اطلاعات ذخیره شده است و با تغییر ظاهر یا قابلیت‌ها از بین
                    نمی‌رود و هزینه‌ی مجددی ثبت نمی‌شود.
                  </p>
                </div>
              ) : payload.identity?.phoneMatched ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <b>مالکیت شماره موبایل با کد ملی تأیید شده است.</b>
                  {payload.identity.nationalCode
                    ? ` کد ملی: ${payload.identity.nationalCode}.`
                    : ''}
                  {payload.identity.birthDate
                    ? ` تاریخ تولد: ${payload.identity.birthDate}.`
                    : ''}{' '}
                  برای تکمیل، فقط استعلام هویت را انجام دهید (شناسه‌ها از قبل ذخیره
                  شده‌اند).
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-muted">
                    کد ملی
                    <input
                      className="indeed-input mt-1"
                      inputMode="numeric"
                      maxLength={10}
                      value={nationalCode}
                      onChange={(event) =>
                        setNationalCode(event.target.value.replace(/\D/g, ''))
                      }
                      placeholder="۱۰ رقم"
                      dir="ltr"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted">
                    تاریخ تولد
                    <JalaliDatePicker value={birthIso} onChange={setBirthIso} className="mt-1" />
                  </label>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60 px-4 py-2.5">
                  <span className="text-xs font-extrabold text-ink">
                    صورتحساب استعلام
                  </span>
                  <span className="text-[10px] font-bold text-muted">
                    به تفکیک هر بخش
                  </span>
                </div>
                <ul className="divide-y divide-[var(--vintage-border)]">
                  {identityServices.length > 0 ? (
                    identityServices.map((item) => (
                      <li
                        key={item.key}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                      >
                        <span className="flex items-center gap-2 text-muted">
                          <ShieldCheck className="size-3.5 text-brand" aria-hidden />
                          {item.label ??
                            (item.key === 'shahkar'
                              ? 'تطبیق شماره موبایل با کد ملی'
                              : 'استعلام هویت')}
                        </span>
                        <span className="font-bold text-ink">
                          {faPrice(item.price ?? 0)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2.5 text-xs text-muted">
                      هزینه‌ی استعلام در حال حاضر تعریف نشده است.
                    </li>
                  )}
                </ul>
                <div className="flex items-center justify-between border-t border-[var(--vintage-border)] bg-brand-light/40 px-4 py-2.5 text-xs">
                  <span className="font-extrabold text-ink">جمع کل</span>
                  <span className="font-extrabold text-brand">
                    {faPrice(identityTotal)}
                  </span>
                </div>
                {identityTotal > 0 ? (
                  <p className="border-t border-dashed border-[var(--vintage-border)] px-4 py-2 text-[10px] leading-5 text-muted">
                    هر دو استعلام (شاهکار + هویتی) با یک پرداخت آنلاین انجام
                    می‌شوند و مبلغی به‌صورت بدهی در کیف پول ثبت نمی‌شود.
                  </p>
                ) : null}
              </div>

              {!payload.identity?.verified && !payload.identity?.phoneMatched ? (
                <button
                  type="button"
                  onClick={() => void completeIdentity()}
                  disabled={identityBusy}
                  className="indeed-btn indeed-btn-primary self-start"
                >
                  {identityBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <BadgeCheck className="size-4" aria-hidden />
                  )}
                  {identityBusy ? 'در حال انتقال به درگاه...' : 'پرداخت و استعلام هویت'}
                </button>
              ) : !payload.identity?.verified ? (
                <button
                  type="button"
                  onClick={() => void continueIdentityInquiry()}
                  disabled={identityBusy}
                  className="indeed-btn indeed-btn-primary self-start"
                >
                  {identityBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <BadgeCheck className="size-4" aria-hidden />
                  )}
                  {identityBusy ? 'در حال انتقال به درگاه...' : 'پرداخت و تکمیل استعلام هویت'}
                </button>
              ) : null}

              {payload.identity?.verified && debt > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/40">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    بدهی کیف پول: {faPrice(debt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void payInvoice()}
                    disabled={paying}
                    className="indeed-btn indeed-btn-primary py-2 text-xs"
                  >
                    <CreditCard className="size-4" aria-hidden />
                    {paying ? 'در حال انتقال...' : 'پرداخت آنلاین'}
                  </button>
                  <Link
                    href="/dashboard/wallet"
                    className="indeed-btn indeed-btn-secondary py-2 text-xs"
                  >
                    <Wallet className="size-4" aria-hidden />
                    بعداً پرداخت می‌کنم
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {step.kind === 'business' ? (
            <OnboardingBusinessForm
              requiredOnly
              defaultFullName={
                [payload.identity?.firstName, payload.identity?.lastName]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              debt={debt}
              paying={paying}
              onPay={() => void payInvoice()}
              onSaved={() => void load()}
            />
          ) : null}

          {step.kind === 'documents' ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                      <FileText className="size-4 text-brand" aria-hidden />
                      مدارک آپلودشده
                    </p>
                    <p className="mt-1 text-[11px] leading-6 text-muted">
                      جواز کسب‌وکار، کارت ملی یا هر مدرکی که تأیید را سریع‌تر
                      می‌کند (PDF یا تصویر، حداکثر ۵ مگابایت).
                    </p>
                  </div>
                  <label
                    className={cn(
                      'indeed-btn indeed-btn-primary cursor-pointer py-2 text-xs',
                      uploading && 'pointer-events-none opacity-70',
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="size-4" aria-hidden />
                    )}
                    {uploading ? 'در حال آپلود...' : 'آپلود فایل'}
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void uploadDocument(file);
                      }}
                    />
                  </label>
                </div>

                {payload.documents?.length ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {payload.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-2 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 px-3 py-2 text-xs"
                      >
                        <FileText className="size-4 shrink-0 text-brand" aria-hidden />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate font-bold text-ink hover:text-brand"
                        >
                          {doc.name}
                        </a>
                        <span className="shrink-0 text-[10px] text-muted">
                          {formatBytes(doc.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeDocument(doc.id)}
                          aria-label={`حذف ${doc.name}`}
                          className="shrink-0 rounded-md p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/30 px-3 py-4 text-center text-[11px] text-muted">
                    هنوز مدرکی آپلود نکرده‌اید.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/profile"
                  className="indeed-btn indeed-btn-secondary py-2 text-xs"
                >
                  <BadgeCheck className="size-4" aria-hidden />
                  ثبت درخواست تیک آبی در پروفایل
                </Link>
                {isOptional && !step.done ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="text-xs font-bold text-muted underline-offset-4 hover:text-brand hover:underline"
                  >
                    فعلاً رد کن
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {step.kind === 'plan' ? (
            <div className="flex flex-col gap-3">
              {plans.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--vintage-border)] p-4 text-center text-xs text-muted">
                  در حال بارگذاری طرح‌ها...
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {plans.map((plan) => {
                    const isCurrent = plan.id === myPlanId;
                    const busy = busyPlanId === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          'flex flex-col rounded-2xl border bg-[var(--vintage-surface)] p-4 transition',
                          isCurrent
                            ? 'border-brand shadow-[0_10px_30px_-20px_rgba(139,58,26,0.6)] ring-1 ring-brand/30 dark:shadow-none'
                            : 'border-[var(--vintage-border)] hover:border-brand/40',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-extrabold text-ink">
                            {plan.name}
                          </h3>
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                              <Crown className="size-3" aria-hidden />
                              فعلی
                            </span>
                          ) : null}
                        </div>
                        {plan.description ? (
                          <p className="mt-1 text-[11px] leading-5 text-muted">
                            {plan.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-lg font-extrabold text-brand">
                          {faPrice(planPriceForMonths(plan, 1))}
                          {plan.price > 0 ? (
                            <span className="text-[10px] font-normal text-muted">
                              {' '}
                              / ماه
                            </span>
                          ) : null}
                        </p>
                        {plan.features.length ? (
                          <ul className="mt-2 flex flex-1 flex-col gap-1 text-[11px] text-ink">
                            {plan.features.slice(0, 4).map((feature) => (
                              <li key={feature} className="flex items-start gap-1.5">
                                <Check
                                  className="mt-0.5 size-3 shrink-0 text-brand"
                                  aria-hidden
                                />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <button
                          type="button"
                          disabled={isCurrent || busy}
                          onClick={() => void choosePlan(plan)}
                          className={cn(
                            'indeed-btn mt-3 w-full py-2 text-xs',
                            isCurrent
                              ? 'indeed-btn-secondary'
                              : 'indeed-btn-primary',
                          )}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <CreditCard className="size-4" aria-hidden />
                          )}
                          {isCurrent
                            ? 'اشتراک فعلی شما'
                            : planPriceForMonths(plan, 1) >= 1000
                              ? 'پرداخت و فعال‌سازی'
                              : 'درخواست اشتراک'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] leading-5 text-muted">
                طرح‌های پولی با پرداخت آنلاین بلافاصله فعال می‌شوند و طرح رایگان
                پس از تأیید مدیر.
              </p>
            </div>
          ) : null}

          {step.kind === 'approval' ? (
            canEnter(safeIndex) ? (
            <div className="flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 via-emerald-50/70 to-[var(--vintage-surface)] p-5 text-center dark:border-emerald-800/60 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-[var(--vintage-surface)]">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <PartyPopper className="size-7" aria-hidden />
                </span>
                <h3 className="mt-3 text-base font-extrabold text-emerald-900 dark:text-emerald-100">
                  همه‌ی مراحل کامل شد!
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-emerald-800 dark:text-emerald-200">
                  کسب‌وکار شما ثبت شد و پس از تأیید مدیر در صفحه‌ی مشاغل و
                  دایرکتوری نمایش داده می‌شود. می‌توانید وضعیت را از پنل پیگیری
                  کنید.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--vintage-surface)] px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-800/60">
                  <Clock className="size-3.5" aria-hidden />
                  در انتظار تأیید مدیر
                </span>
              </div>

              <div className="rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-ink">وضعیت کیف پول</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {debt > 0
                        ? `بدهی فعلی: ${faPrice(debt)}`
                        : 'بدهی فعالی ندارید.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {debt > 0 ? (
                      <button
                        type="button"
                        onClick={() => void payInvoice()}
                        disabled={paying}
                        className="indeed-btn indeed-btn-primary py-2 text-xs"
                      >
                        <CreditCard className="size-4" aria-hidden />
                        {paying ? 'در حال انتقال...' : 'پرداخت آنلاین'}
                      </button>
                    ) : null}
                    <Link
                      href="/dashboard/wallet"
                      className="indeed-btn indeed-btn-secondary py-2 text-xs"
                    >
                      <Wallet className="size-4" aria-hidden />
                      کیف پول و پرداخت
                    </Link>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/business-cards"
                className="indeed-btn indeed-btn-secondary w-fit py-2 text-xs"
              >
                مشاهده‌ی کسب‌وکار من
                <ArrowLeft className="size-4" aria-hidden />
              </Link>
            </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-5 text-center text-xs leading-6 text-muted">
                این پیام پس از تکمیل همه‌ی مراحل قبلی نمایش داده می‌شود.
              </p>
            )
          ) : null}

          {isManual(step) && step.kind !== 'welcome' ? (
            <button
              type="button"
              onClick={() => void toggleManualStep(step)}
              disabled={busyStepId === step.id}
              className={cn(
                'indeed-btn py-2 text-xs self-start',
                step.done ? 'indeed-btn-secondary' : 'indeed-btn-primary',
              )}
            >
              {busyStepId === step.id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              {step.done ? 'برداشتن تیک این مرحله' : 'این مرحله را انجام دادم'}
            </button>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* footer navigation                                                */}
          {/* ---------------------------------------------------------------- */}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-dashed border-[var(--vintage-border)] pt-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={isFirst}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              <ArrowRight className="size-4" aria-hidden />
              مرحله قبل
            </button>
            {isLast ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {payload.completed === payload.total
                  ? 'همه‌ی مراحل تکمیل شد 🎉'
                  : 'آخرین مرحله'}
              </span>
            ) : (
              <div className="flex items-center gap-3">
                {!stepUnlocked ? (
                  <span className="hidden text-[10px] font-bold text-amber-700 sm:inline dark:text-amber-300">
                    ابتدا این مرحله را کامل کنید
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!stepUnlocked}
                  className={cn(
                    'indeed-btn indeed-btn-primary py-2 text-xs',
                    !stepUnlocked && 'cursor-not-allowed opacity-50',
                  )}
                >
                  مرحله بعد
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {payload.history?.length ? (
        <div className="border-t border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex w-full items-center gap-2 p-3.5 text-xs font-bold text-ink"
          >
            <History className="size-4 text-brand" aria-hidden />
            سابقه‌ی استعلام‌ها و نتایج
            <span className="text-muted">
              ({payload.history.length.toLocaleString('fa-IR')} مورد)
            </span>
            <ChevronDown
              className={cn('ms-auto size-4 text-muted transition', historyOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
          {historyOpen ? (
            <ul className="flex flex-col gap-2 px-4 pb-4">
              {payload.history.map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-3 text-[11px] leading-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        LOG_STATUS_CLASS[log.status],
                      )}
                    >
                      {LOG_STATUS_LABEL[log.status]}
                    </span>
                    <b className="text-ink">{LOG_KIND_LABEL[log.kind]}</b>
                    <span className="text-muted">
                      {new Date(log.createdAt).toLocaleString('fa-IR')}
                    </span>
                    <span className="ms-auto text-muted">
                      {log.amount > 0 ? `مبلغ: ${faPrice(log.amount)}` : 'بدون هزینه'}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    {[
                      log.nationalCode ? `کد ملی: ${log.nationalCode}` : null,
                      log.birthDate ? `تاریخ تولد: ${log.birthDate}` : null,
                      [log.firstName, log.lastName].filter(Boolean).join(' ') || null,
                      log.fatherName ? `نام پدر: ${log.fatherName}` : null,
                    ]
                      .filter(Boolean)
                      .join(' — ') || '—'}
                  </p>
                  {log.message ? (
                    <p className="mt-0.5 text-[10px] text-muted">{log.message}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
