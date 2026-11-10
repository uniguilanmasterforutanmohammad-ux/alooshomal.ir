'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Crown,
  FileCheck2,
  History,
  ListChecks,
  Loader2,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import { isoToJalali } from '@/lib/jalali';
import { toast } from '@/lib/toast';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { cn } from '@/lib/utils';

type StepKind =
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
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-600',
  CACHED: 'bg-sky-50 text-sky-700',
};

const STEP_ICON: Record<StepKind, typeof Sparkles> = {
  identity: BadgeCheck,
  business: Building2,
  details: ListChecks,
  documents: FileCheck2,
  plan: Crown,
  approval: Clock,
  custom: Sparkles,
};

function faPrice(amount: number): string {
  if (amount <= 0) return 'رایگان';
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

/**
 * «شروع آسان» — the admin-configurable, step-by-step onboarding wizard that
 * sits at the top of the user dashboard. Completion of the built-in steps is
 * derived from account data (identity inquiry, business card, blue tick,
 * subscription, admin approval); admin-added steps are ticked manually.
 */
export function OnboardingWizard() {
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [tariff, setTariff] = useState<number>(0);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [nationalCode, setNationalCode] = useState('');
  const [birthIso, setBirthIso] = useState('');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const [progress, walletPayload] = await Promise.all([
        api.get<OnboardingPayload>('/onboarding/me'),
        api.get<WalletPayload>('/wallet/mine').catch(() => null),
      ]);
      setPayload(progress);
      setWallet(walletPayload);
      setNationalCode((current) => current || progress.identity?.nationalCode || '');
      setExpandedId((current) => current ?? progress.currentStepId);
    } catch {
      setPayload(null);
    }
  }, []);

  useEffect(() => {
    void load();
    void api
      .get<ZohalPrice[]>('/zohal/pricing')
      .then((list) => {
        const sum = list
          .filter((item) => item.key === 'shahkar' || item.key === 'national_identity_inquiry')
          .reduce((total, item) => total + (item.price ?? 0), 0);
        setTariff(sum);
      })
      .catch(() => setTariff(0));
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
      await api.post('/profile/identity/phone-match', {
        nationalCode: nationalCode.trim(),
        birthDate,
      });
      await api.post('/profile/identity/inquiry', {});
      toast.success('هویت شما استعلام شد (تیک سفید).');
      await load();
      // Keep the identity step open so the invoice / pay-later choice shows.
      setExpandedId('identity');
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
      const result = await api.post<{ alreadyVerified?: boolean }>(
        '/profile/identity/inquiry',
        {},
      );
      toast.success(
        result?.alreadyVerified
          ? 'هویت شما قبلاً استعلام شده بود؛ هزینه‌ی مجدد ثبت نشد.'
          : 'استعلام هویت انجام شد (تیک سفید).',
      );
      await load();
      setExpandedId('identity');
    } catch {
      /* api layer surfaces the error */
    } finally {
      setIdentityBusy(false);
    }
  }

  async function payInvoice() {
    setPaying(true);
    try {
      const result = await api.post<{ url?: string }>('/wallet/checkout', {});
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

  async function toggleCustomStep(step: OnboardingStep) {
    setBusyStepId(step.id);
    try {
      const next = step.done
        ? await api.delete<OnboardingPayload>(`/onboarding/steps/${step.id}/complete`)
        : await api.post<OnboardingPayload>(`/onboarding/steps/${step.id}/complete`, {});
      setPayload(next);
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusyStepId(null);
    }
  }

  if (!payload || payload.total === 0) return null;

  const debt = wallet && wallet.balance < 0 ? Math.abs(wallet.balance) : 0;
  const percent = payload.total > 0 ? Math.round((payload.completed / payload.total) * 100) : 0;

  return (
    <section className="indeed-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vintage-border)] bg-brand-light/60 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-brand" aria-hidden />
              پیشرفت شما
            </span>
            <span className="text-ink">
              {payload.completed.toLocaleString('fa-IR')} از {payload.total.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </header>

      <ol className="divide-y divide-[var(--vintage-border)]">
        {payload.steps.map((step, index) => {
          const Icon = STEP_ICON[step.kind] ?? Sparkles;
          const open = expandedId === step.id;
          const active = payload.currentStepId === step.id;
          return (
            <li key={step.id} id={`onboarding-${step.id}`}>
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : step.id)}
                className="flex w-full items-center gap-3 p-3.5 text-right transition hover:bg-[var(--vintage-paper)]"
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold',
                    step.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : active
                        ? 'border-brand bg-brand text-white'
                        : 'border-[var(--vintage-border)] bg-white text-muted',
                  )}
                >
                  {step.done ? <Check className="size-4" aria-hidden /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-brand" aria-hidden />
                    <b className="truncate text-sm font-extrabold text-ink">{step.title}</b>
                    {step.kind === 'identity' && step.done ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        تیک سفید
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">{step.hint}</span>
                </span>
                <ChevronDown
                  className={cn('size-4 shrink-0 text-muted transition', open && 'rotate-180')}
                  aria-hidden
                />
              </button>

              {open ? (
                <div className="border-t border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60 px-4 py-4">
                  <p className="text-xs leading-6 text-muted">{step.description}</p>

                  {step.kind === 'identity' ? (
                    <div className="mt-3 flex flex-col gap-3">
                      {payload.identity?.verified ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
                          <b className="flex items-center gap-1.5">
                            <BadgeCheck className="size-4" aria-hidden />
                            هویت شما تأیید شد؛ تیک سفید دریافت کردید.
                          </b>
                          <p className="mt-1">
                            {[
                              payload.identity.firstName,
                              payload.identity.lastName,
                            ]
                              .filter(Boolean)
                              .join(' ') || '—'}
                            {payload.identity.fatherName
                              ? ` — نام پدر: ${payload.identity.fatherName}`
                              : ''}
                            {payload.identity.nationalCode
                              ? ` — کد ملی: ${payload.identity.nationalCode}`
                              : ''}
                          </p>
                          <p className="mt-1 text-[11px] text-emerald-700">
                            این اطلاعات ذخیره شده است و با تغییر ظاهر یا قابلیت‌ها
                            از بین نمی‌رود و هزینه‌ی مجددی ثبت نمی‌شود.
                          </p>
                        </div>
                      ) : payload.identity?.phoneMatched ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
                          <b>مالکیت شماره موبایل با کد ملی تأیید شده است.</b>
                          {payload.identity.nationalCode
                            ? ` کد ملی: ${payload.identity.nationalCode}.`
                            : ''}
                          {payload.identity.birthDate
                            ? ` تاریخ تولد: ${payload.identity.birthDate}.`
                            : ''}{' '}
                          برای تکمیل، فقط استعلام هویت را انجام دهید (شناسه‌ها
                          از قبل ذخیره شده‌اند).
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
                            <JalaliDatePicker
                              value={birthIso}
                              onChange={setBirthIso}
                              className="mt-1"
                            />
                          </label>
                        </div>
                      )}

                      <div className="rounded-lg border border-[var(--vintage-border)] bg-white p-3 text-xs leading-6 text-muted">
                        <span className="font-bold text-ink">صورتحساب استعلام:</span>{' '}
                        {faPrice(tariff)}
                        {tariff > 0
                          ? ' — مبلغ ابتدا به‌صورت بدهی در کیف پول ثبت می‌شود و می‌توانید همان‌جا پرداخت کنید یا بعداً تسویه کنید.'
                          : ''}
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
                          {identityBusy ? 'در حال استعلام...' : 'تأیید و پرداخت'}
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
                          {identityBusy
                            ? 'در حال استعلام...'
                            : 'ادامه: استعلام و ثبت هویت'}
                        </button>
                      ) : null}

                      {payload.identity?.verified && debt > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <span className="text-xs font-bold text-amber-800">
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

                  {step.kind === 'custom' ? (
                    <button
                      type="button"
                      onClick={() => void toggleCustomStep(step)}
                      disabled={busyStepId === step.id}
                      className={cn(
                        'mt-3 indeed-btn py-2 text-xs',
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

                  {step.kind !== 'identity' && step.kind !== 'custom' && step.href ? (
                    <Link
                      href={step.href}
                      className="mt-3 indeed-btn indeed-btn-primary w-fit py-2 text-xs"
                    >
                      ادامه‌ی این مرحله
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {payload.history?.length ? (
        <details className="group border-t border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-3.5 text-xs font-bold text-ink">
            <History className="size-4 text-brand" aria-hidden />
            سابقه‌ی استعلام‌ها و نتایج
            <span className="text-muted">
              ({payload.history.length.toLocaleString('fa-IR')} مورد)
            </span>
            <ChevronDown
              className="ms-auto size-4 text-muted transition group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="flex flex-col gap-2 px-4 pb-4">
            {payload.history.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border border-[var(--vintage-border)] bg-white p-3 text-[11px] leading-6"
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
        </details>
      ) : null}
    </section>
  );
}
