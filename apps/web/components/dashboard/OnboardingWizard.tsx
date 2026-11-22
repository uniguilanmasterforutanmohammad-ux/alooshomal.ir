'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Boxes,
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
  Upload,
} from 'lucide-react';

import {
  api,
  type MySubscriptions,
  type SubscriptionAddonQuote,
  type SubscriptionAddonQuotePackage,
  type SubscriptionCheckout,
  type SubscriptionPlan,
} from '@/lib/api';
import { isoToJalali, jalaliToIso, parseJalali } from '@/lib/jalali';
import {
  PLAN_PERIODS,
  PLAN_PERIOD_LABELS,
  isFreePlan,
  planPriceForMonths,
  type PlanPeriodMonths,
} from '@/lib/plan-periods';
import { toast } from '@/lib/toast';
import { useFeatures } from '@/lib/features';
import {
  OnboardingBusinessForm,
  type OnboardingBusinessDraft,
  type OnboardingBusinessFormHandle,
} from '@/components/dashboard/OnboardingBusinessForm';
import { cn } from '@/lib/utils';

type StepKind =
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

interface OnboardingStep {
  id: string;
  kind: StepKind;
  title: string;
  description: string;
  href?: string;
  moduleKey?: string;
  enabled: boolean;
  optional?: boolean;
  done: boolean;
  hint: string;
  module?: OnboardingModuleInfo | null;
  data?: Record<string, unknown> | null;
  result?: unknown | null;
}

interface OnboardingModuleField {
  name: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'file';
  placeholder?: string;
}

interface OnboardingModuleInfo {
  key: string;
  type: 'zohal' | 'apiir' | 'plan' | 'management' | 'biolink' | 'businessCard';
  label: string;
  description: string;
  href: string;
  price: number;
  fields: OnboardingModuleField[];
}

interface OnboardingPayload {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  currentStepId: string | null;
  identity: IdentityState;
  history: IdentityLog[];
  documents: OnboardingDocument[];
  business: OnboardingBusinessState | null;
  finished?: boolean;
  cart?: OnboardingCartItem[];
  cartTotal?: number;
  pendingModuleDelivery?: boolean;
}

interface OnboardingCartItem {
  stepId: string;
  moduleKey: string;
  type: 'zohal' | 'apiir' | 'plan' | 'management' | 'biolink' | 'businessCard';
  label: string;
  amount: number;
}

interface OnboardingBusinessState {
  id: string;
  name: string;
  industryKey: string;
  industryLabel: string;
  cityId: string | null;
  businessId: string | null;
  mobile: string | null;
  additionalMobiles?: string[];
  address: string | null;
  fullName: string | null;
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
  businessLicenseVerified: boolean;
  businessLicenseStatus: 'SUCCESS' | 'FAILED' | 'CACHED' | null;
  businessLicenseMessage: string | null;
  businessLicenseOwnerName: string | null;
  businessLicenseCheckedAt: string | null;
}

/** Tariff of the identity bundle and the optional license inquiry. */
interface IdentityQuote {
  identityTotal: number;
  identityAvailable?: boolean;
  licensePrice: number;
  licenseAvailable: boolean;
  total: number;
}

/** One «مدیریت کسب‌وکار» package as returned by the catalog endpoint. */
interface CatalogIndustry {
  key: string;
  label: string;
  description?: string;
  available?: boolean;
}

interface IdentityLog {
  id: string;
  kind: 'PHONE_MATCH' | 'IDENTITY_INQUIRY' | 'BUSINESS_LICENSE';
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
  BUSINESS_LICENSE: 'استعلام جواز کسب',
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
  management: Building2,
  invoice: CreditCard,
  approval: Clock,
  module: Boxes,
  custom: Sparkles,
};

const MANUAL_KINDS: StepKind[] = ['welcome', 'module', 'custom'];

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
  const { isFeatureVisible } = useFeatures();
  const walletVisible = isFeatureVisible('featureWallet');
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [pricing, setPricing] = useState<ZohalPrice[]>([]);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [businessBusy, setBusinessBusy] = useState(false);
  const [nationalCode, setNationalCode] = useState('');
  const [birthIso, setBirthIso] = useState('');
  const [birthText, setBirthText] = useState('');
  const [uploading, setUploading] = useState(false);
  // Values typed into an admin-added `module` step's dynamic form, keyed by
  // step id then field name. Saved values come back as `step.data`.
  const [moduleDraft, setModuleDraft] = useState<
    Record<string, Record<string, string>>
  >({});
  const [moduleUploading, setModuleUploading] = useState<string | null>(null);
  // Guards the fallback delivery so a paid module checkout is delivered once.
  const moduleDeliveryRef = useRef(false);
  const businessFormRef = useRef<OnboardingBusinessFormHandle | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [myPlanId, setMyPlanId] = useState<string | null>(null);
  const [planMonths, setPlanMonths] = useState<PlanPeriodMonths>(1);
  // The plan/management steps only *select* items; the single payment happens
  // on the invoice step. `selectedPlanId` is the plan chosen for that invoice.
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [managementSkipped, setManagementSkipped] = useState(false);
  const [selectedManagementKey, setSelectedManagementKey] = useState<
    string | null
  >(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [advanceAfterLoad, setAdvanceAfterLoad] = useState(false);
  const jumpedToPending = useRef(false);
  // Identity step: the optional «جواز کسب» leg that turns the white tick into
  // a blue tick. Both its price and availability come from the server quote.
  const [identityQuote, setIdentityQuote] = useState<IdentityQuote | null>(null);
  const [withLicense, setWithLicense] = useState(false);
  const [licenseTrackingCode, setLicenseTrackingCode] = useState('');
  // Plan step: the «مدیریت کسب‌وکار» add-on offered only when the step-2
  // business category maps to an available management package.
  const [catalogIndustries, setCatalogIndustries] = useState<CatalogIndustry[]>(
    [],
  );
  const [addonQuotes, setAddonQuotes] = useState<
    Record<string, SubscriptionAddonQuote>
  >({});
  const [withManagement, setWithManagement] = useState(false);
  // Result of the identity inquiry that runs right after the combined payment.
  const [identityResult, setIdentityResult] = useState<{
    success: boolean;
    message: string | null;
  } | null>(null);
  // Optional identity step: the inquiry is only charged after the user
  // explicitly continues with it (not when the step is skipped or disabled).
  const [identityOptedIn, setIdentityOptedIn] = useState(false);
  // The step chips are a horizontal scroller on phones; keep the active chip
  // in view so a long journey never hides the current step off-screen.
  const stepsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = stepsRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      '[data-state="active"]',
    );
    active?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [index, payload?.steps.length]);

  function markIdentityOptIn(value: boolean) {
    setIdentityOptedIn(value);
  }

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
    void api
      .get<IdentityQuote>('/profile/identity/quote')
      .then((quote) => setIdentityQuote(quote))
      .catch(() => setIdentityQuote(null));
    void api
      .get<{ industries?: CatalogIndustry[] }>('/business-modules/catalog')
      .then((catalog) => setCatalogIndustries(catalog.industries ?? []))
      .catch(() => setCatalogIndustries([]));
  }, [load]);

  // The management add-on price is prorated for the chosen term; refresh the
  // quote for every plan whenever the term changes. The free plan is included
  // so the package list can still be shown (with every item disabled).
  useEffect(() => {
    if (plans.length === 0) {
      setAddonQuotes({});
      return;
    }
    let alive = true;
    void (async () => {
      const fetched = await Promise.all(
        plans.map(async (plan) => {
          try {
            const quote = await api.get<SubscriptionAddonQuote>(
              `/subscriptions/plans/${plan.id}/addon-quote?months=${planMonths}`,
            );
            return [plan.id, quote] as const;
          } catch {
            return [plan.id, null] as const;
          }
        }),
      );
      if (!alive) return;
      const next: Record<string, SubscriptionAddonQuote> = {};
      for (const [id, quote] of fetched) {
        if (quote) next[id] = quote;
      }
      setAddonQuotes(next);
    })();
    return () => {
      alive = false;
    };
  }, [plans, planMonths]);

  // The combined checkout returns with `?payment=success&identity=pending`:
  // the plan/management are already active, and the identity inquiry runs now
  // (it was paid in the same transaction, so it never charges again).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('identity');
    if (!status) return;
    void (async () => {
      if (status === 'pending') {
        try {
          const result = await api.post<{
            ran: boolean;
            success: boolean;
            message: string | null;
          }>('/onboarding/identity/run', {});
          setIdentityResult({
            success: result.success,
            message: result.message,
          });
          if (result.success) {
            toast.success('استعلام هویت با موفقیت انجام شد.');
            setAdvanceAfterLoad(true);
          } else {
            toast.error(result.message ?? 'استعلام هویت ناموفق بود.');
          }
        } catch {
          setIdentityResult({
            success: false,
            message: 'استعلام هویت انجام نشد؛ لطفاً دوباره تلاش کنید.',
          });
        }
        await load();
      } else if (status === 'success') {
        setIdentityResult({
          success: true,
          message: 'استعلام هویت با موفقیت انجام شد.',
        });
        setAdvanceAfterLoad(true);
        await load();
      } else {
        setIdentityResult({
          success: false,
          message: 'استعلام هویت انجام نشد یا لغو شد.',
        });
      }
    })();
    params.delete('identity');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, [load]);

  // The combined checkout returns with `?payment=success&modules=pending` when
  // priced module steps were paid: run their inquiries now (already paid).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('modules');
    if (!status) return;
    void (async () => {
      if (status === 'pending') {
        try {
          const result = await api.post<{
            delivered: number;
            results: Array<{ stepId: string; ok: boolean }>;
          }>('/onboarding/cart/deliver', {});
          if (result.delivered > 0) {
            const failed = result.results.filter((entry) => !entry.ok).length;
            if (failed === 0) {
              toast.success('استعلام‌های خریداری‌شده با موفقیت انجام شد.');
            } else {
              toast.error(
                `${failed.toLocaleString('fa-IR')} استعلام ناموفق بود؛ بعداً از پروفایل دوباره تلاش کنید.`,
              );
            }
          }
        } catch {
          toast.error('اجرای استعلام‌های خریداری‌شده ناموفق بود.');
        }
        await load();
      }
    })();
    params.delete('modules');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, [load]);

  // Fallback: if the gateway redirect (and its `modules=pending` flag) was
  // lost, still deliver any paid-but-undelivered module inquiries on load.
  useEffect(() => {
    if (!payload?.pendingModuleDelivery || moduleDeliveryRef.current) return;
    moduleDeliveryRef.current = true;
    void (async () => {
      try {
        const result = await api.post<{ delivered: number }>(
          '/onboarding/cart/deliver',
          {},
        );
        if (result.delivered > 0) {
          toast.success('استعلام‌های خریداری‌شده انجام شد.');
          await load();
        }
      } catch {
        /* retried on the next load */
      }
    })();
  }, [payload?.pendingModuleDelivery, load]);

  // A subscription paid from the onboarding plan step returns here. Refresh
  // progress and move to the next step once the paid plan is active.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;
    if (payment === 'success') {
      toast.success('پرداخت انجام شد و اشتراک شما به‌روزرسانی شد.');
      setAdvanceAfterLoad(true);
      void load();
    } else if (payment === 'pending') {
      toast.success('تأیید پرداخت در حال پردازش است؛ چند لحظه بعد دوباره تلاش کنید.');
      void load();
    } else {
      toast.error('پرداخت اشتراک انجام نشد یا لغو شد.');
    }
    params.delete('payment');
    params.delete('plan');
    params.delete('activation');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, [load]);

  useEffect(() => {
    if (!advanceAfterLoad || !payload) return;
    setAdvanceAfterLoad(false);
    // After the single payment, jump to the result step (the last one).
    const resultIndex = payload.steps.findIndex(
      (entry) => entry.kind === 'approval',
    );
    const next = resultIndex >= 0 ? resultIndex : payload.steps.length - 1;
    if (next >= 0) setIndex(next);
  }, [advanceAfterLoad, payload, index]);

  /** Validate the identity inputs and move on; payment happens on the invoice. */
  function saveIdentityAndNext() {
    if (payload?.identity?.phoneMatched) {
      // The national code / birth date are already stored on the account; the
      // backend falls back to them when the checkout omits them.
      markIdentityOptIn(true);
      nextStep();
      return;
    }
    if (!/^\d{10}$/.test(nationalCode.trim())) {
      toast.error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    const jalali = isoToJalali(birthIso);
    if (!jalali) {
      toast.error('برای استعلام هویت، تاریخ تولد را انتخاب کنید.');
      return;
    }
    if (withLicense && !licenseTrackingCode.trim()) {
      toast.error('برای استعلام جواز کسب، کد پیگیری جواز را وارد کنید.');
      return;
    }
    markIdentityOptIn(true);
    nextStep();
  }

  /**
   * Retry the identity inquiry on its own (used on the result step when the
   * combined payment's inquiry failed). This is a new paid attempt — the
   * wizard warns that a wrong national code / birth date is not refundable.
   */
  async function payIdentityOnly() {
    if (!/^\d{10}$/.test(nationalCode.trim())) {
      toast.error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    const jalali = isoToJalali(birthIso);
    if (!jalali) {
      toast.error('برای استعلام هویت، تاریخ تولد را انتخاب کنید.');
      return;
    }
    if (withLicense && !licenseTrackingCode.trim()) {
      toast.error('برای استعلام جواز کسب، کد پیگیری جواز را وارد کنید.');
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
        withLicense,
        ...(withLicense ? { licenseTrackingCode: licenseTrackingCode.trim() } : {}),
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
      setIdentityResult({
        success: true,
        message: withLicense
          ? 'هویت و جواز کسب شما تأیید شد (تیک آبی).'
          : 'هویت شما تأیید شد (تیک سفید).',
      });
      toast.success(
        withLicense
          ? 'پرداخت انجام شد و هویت شما استعلام شد (تیک آبی برای جواز کسب).'
          : 'پرداخت انجام شد و هویت شما استعلام شد (تیک سفید).',
      );
      setAdvanceAfterLoad(true);
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setIdentityBusy(false);
    }
  }

  async function finishOnboarding() {
    try {
      await api.post('/onboarding/finish', {});
      toast.success('«شروع آسان» تکمیل شد و از پنل کاربری برداشته شد.');
      // Full navigation so the dashboard shell re-reads the profile and drops
      // the «شروع آسان» entry immediately.
      window.location.assign('/dashboard');
    } catch {
      /* api layer surfaces the error */
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

  function moduleValue(step: OnboardingStep, field: OnboardingModuleField): string {
    const draft = moduleDraft[step.id]?.[field.name];
    if (draft !== undefined) return draft;
    const saved = step.data?.[field.name];
    return saved === undefined || saved === null ? '' : String(saved);
  }

  function setModuleValue(
    step: OnboardingStep,
    field: OnboardingModuleField,
    value: string,
  ) {
    setModuleDraft((prev) => ({
      ...prev,
      [step.id]: { ...(prev[step.id] ?? {}), [field.name]: value },
    }));
  }

  async function uploadModuleFile(
    step: OnboardingStep,
    field: OnboardingModuleField,
    file: File,
  ) {
    const key = `${step.id}:${field.name}`;
    setModuleUploading(key);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api.upload<{ url: string }>(
        '/uploads/document',
        form,
      );
      setModuleValue(step, field, uploaded.url);
      toast.success('فایل با موفقیت آپلود شد.');
    } catch {
      /* api layer surfaces the error */
    } finally {
      setModuleUploading(null);
    }
  }

  /** Submit the dynamic form of one admin-added module step. */
  async function saveModuleStep(step: OnboardingStep): Promise<boolean> {
    const fields = step.module?.fields ?? [];
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = moduleValue(step, field).trim();
      if (field.required && !raw) {
        toast.error(`مقدار «${field.label}» الزامی است.`);
        return false;
      }
      if (raw) data[field.name] = field.type === 'boolean' ? raw === 'true' : raw;
    }
    setBusyStepId(step.id);
    try {
      const next = await api.post<OnboardingPayload>(
        `/onboarding/steps/${step.id}/data`,
        { data },
      );
      setPayload(next);
      setModuleDraft((prev) => {
        const copy = { ...prev };
        delete copy[step.id];
        return copy;
      });
      toast.success('اطلاعات این مرحله ثبت شد.');
      return true;
    } catch {
      /* api layer surfaces the error */
      return false;
    } finally {
      setBusyStepId(null);
    }
  }

  /** Pick a plan for the final invoice (no payment yet). */
  function selectPlan(plan: SubscriptionPlan) {
    setSelectedPlanId(plan.id);
    // Persist the choice so the free plan (assigned automatically at signup)
    // also counts as a completed step. The plan is activated by the invoice.
    void api
      .post<OnboardingPayload>('/onboarding/plan/selected', { planId: plan.id })
      .then((next) => setPayload(next))
      .catch(() => undefined);
    toast.success(`اشتراک «${plan.name}» به صورتحساب اضافه شد.`);
  }

  /**
   * One gateway payment for everything the user picked: the subscription,
   * the optional management package and the identity inquiry. The backend
   * activates the plan/package and then the onboarding page runs the inquiry.
   */
  async function payOnboardingInvoice() {
    const plan = plans.find((entry) => entry.id === selectedPlanId);
    if (!plan) {
      if (identityPayable) {
        // Nothing but the inquiry is left to pay — use the identity-only
        // checkout so an already-subscribed user can finish onboarding.
        await payIdentityOnly();
        return;
      }
      toast.error('ابتدا یک اشتراک اکو یا بلاس انتخاب کنید.');
      return;
    }
    const business = payload?.business ?? null;
    const includeManagement =
      withManagement &&
      Boolean(selectedManagementPackage) &&
      !isFreePlan(plan) &&
      managementAmount >= 1000;
    const workspaceIds =
      includeManagement && business ? [business.id] : [];
    const jalali = isoToJalali(birthIso);
    const birthDate = jalali
      ? `${jalali.year}/${String(jalali.month).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`
      : undefined;
    const needsIdentity = identityChargeable;
    const needsLicense = licenseChargeable;
    if (needsIdentity && !payload?.identity?.phoneMatched) {
      if (!/^\d{10}$/.test(nationalCode.trim()) || !birthDate) {
        toast.error(
          'برای استعلام هویت، ابتدا کد ملی و تاریخ تولد را در مرحله‌ی استعلام وارد کنید.',
        );
        return;
      }
    }
    if (needsLicense && !licenseTrackingCode.trim()) {
      toast.error('برای استعلام جواز کسب، کد پیگیری جواز را وارد کنید.');
      return;
    }
    const identity =
      needsIdentity || needsLicense
        ? {
            ...(needsIdentity
              ? { nationalCode: nationalCode.trim(), birthDate }
              : {}),
            withLicense: needsLicense,
            ...(needsLicense
              ? { licenseTrackingCode: licenseTrackingCode.trim() }
              : {}),
          }
        : undefined;
    const moduleStepIds = (payload?.cart ?? []).map((item) => item.stepId);
    setInvoiceBusy(true);
    try {
      const checkout = await api.post<SubscriptionCheckout>(
        `/subscriptions/${plan.id}/checkout`,
        {
          months: planMonths,
          returnTo: '/dashboard/onboarding',
          workspaceIds,
          ...(moduleStepIds.length > 0 ? { moduleStepIds } : {}),
          ...(includeManagement && selectedManagementPackage
            ? { managementPackageKey: selectedManagementPackage.key }
            : {}),
          ...(identity ? { identity } : {}),
        },
      );
      if (checkout?.wallet) {
        toast.success('پرداخت از کیف پول انجام شد و موارد انتخابی فعال شدند.');
        setMyPlanId(plan.id);
        await load();
        setAdvanceAfterLoad(true);
        return;
      }
      if (checkout?.url) {
        window.location.href = checkout.url;
        return;
      }
      toast.error('لینک پرداخت از درگاه دریافت نشد.');
    } catch {
      /* api layer surfaces the error */
    } finally {
      setInvoiceBusy(false);
    }
  }

  async function toggleManualStep(
    step: OnboardingStep,
    thenNext = false,
  ): Promise<boolean> {
    setBusyStepId(step.id);
    try {
      const next = step.done
        ? await api.delete<OnboardingPayload>(`/onboarding/steps/${step.id}/complete`)
        : await api.post<OnboardingPayload>(`/onboarding/steps/${step.id}/complete`, {});
      setPayload(next);
      if (thenNext && !step.done) goTo(safeIndex + 1);
      return true;
    } catch {
      /* api layer surfaces the error */
      return false;
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
  const identityTotal =
    identityQuote?.identityTotal ??
    identityServices.reduce((total, item) => total + (item.price ?? 0), 0);
  const identityAvailable =
    identityQuote?.identityAvailable ?? identityServices.length >= 2;
  const licensePrice = identityQuote?.licensePrice ?? 0;
  const showLicense = Boolean(identityQuote?.licenseAvailable) && licensePrice > 0;
  const identityVerified = Boolean(payload.identity?.verified);
  const licenseSelected = withLicense && showLicense;
  const identityStep =
    steps.find((entry) => entry.kind === 'identity') ?? null;
  // A disabled identity step is absent from `steps`; an optional one only
  // charges when the user explicitly opted in. Both cases must stay off the
  // invoice, otherwise the buyer is charged for an inquiry they never entered.
  const identityChargeable =
    identityAvailable &&
    Boolean(identityStep) &&
    !identityVerified &&
    (!identityStep?.optional || identityOptedIn);
  const licenseChargeable =
    identityAvailable &&
    Boolean(identityStep) &&
    licenseSelected &&
    !payload?.identity?.businessLicenseVerified;
  // Whether an identity result should be shown on the final step at all. A
  // disabled or optional-skipped step leaves the account unverified by design.
  const identityExpected =
    Boolean(identityResult) ||
    identityVerified ||
    (identityAvailable &&
      Boolean(identityStep) &&
      (!identityStep?.optional || identityOptedIn));
  const businessState = payload.business;
  // Every available management package is listed; the quote for the chosen
  // plan carries the prorated price of each one.
  const selectedQuote = selectedPlanId
    ? addonQuotes[selectedPlanId]
    : undefined;
  const managementPackages: SubscriptionAddonQuotePackage[] =
    selectedQuote?.packages?.length
      ? selectedQuote.packages
      : catalogIndustries
          .filter((entry) => entry.available)
          .map((entry) => ({
            key: entry.key,
            label: entry.label,
            amount: 0,
            months: planMonths,
            available: true,
          }));
  const selectedManagementPackage =
    managementPackages.find((entry) => entry.key === selectedManagementKey) ??
    null;
  const managementAmount = selectedManagementPackage?.amount ?? 0;
  const showManagement = managementPackages.length > 0;
  // The plan step sells every plan, including the free one.
  const selectablePlans = plans;
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const myPlan = plans.find((plan) => plan.id === myPlanId) ?? null;
  const currentIsPaid = Boolean(myPlan) && !isFreePlan(myPlan);
  const planAmount = selectedPlan
    ? planPriceForMonths(selectedPlan, planMonths)
    : 0;
  const includeManagement =
    withManagement &&
    Boolean(selectedManagementPackage) &&
    Boolean(selectedPlan) &&
    !isFreePlan(selectedPlan) &&
    managementAmount >= 1000;
  const cart = payload.cart ?? [];
  const cartTotal =
    payload.cartTotal ?? cart.reduce((sum, item) => sum + item.amount, 0);
  const invoiceTotalAmount =
    planAmount +
    (includeManagement ? managementAmount : 0) +
    (identityChargeable ? identityTotal : 0) +
    (licenseChargeable ? licensePrice : 0) +
    cartTotal;
  const planSelected = Boolean(selectedPlan);
  /** Identity/license items that still need to be paid on this invoice. */
  const identityPayable = identityChargeable || licenseChargeable;
  /** The invoice can be paid when it carries a plan or a pending inquiry. */
  const invoicePayable = planSelected || identityPayable || cartTotal > 0;
  const invoiceNeedsPayment = invoicePayable && invoiceTotalAmount >= 1000;
  const identityInputsReady =
    !identityAvailable ||
    identityVerified ||
    Boolean(payload.identity?.phoneMatched) ||
    (/^\d{10}$/.test(nationalCode.trim()) &&
      Boolean(birthIso) &&
      (!withLicense || Boolean(licenseTrackingCode.trim())));
  const businessInitial: OnboardingBusinessDraft | null = businessState
    ? {
        name: businessState.name ?? '',
        fullName: businessState.fullName ?? '',
        cityId: businessState.cityId ?? '',
        businessId: businessState.businessId ?? '',
        mobile: businessState.mobile ?? '',
        additionalMobiles: businessState.additionalMobiles ?? [],
        address: businessState.address ?? '',
      }
    : null;
  const percent =
    payload.total > 0 ? Math.round((payload.completed / payload.total) * 100) : 0;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === steps.length - 1;
  const isOptional = step.optional === true;
  const navBusy =
    businessBusy ||
    busyStepId !== null ||
    identityBusy ||
    invoiceBusy ||
    uploading;

  /** A step can be opened once every earlier required step is complete. */
  function canEnter(position: number): boolean {
    const target = steps[position];
    // The checkout steps (plan → management → invoice) form one guided flow:
    // they unlock once the business exists, even though identity/plan only
    // become "done" after the single payment.
    if (
      target &&
      (target.kind === 'plan' ||
        target.kind === 'management' ||
        target.kind === 'invoice')
    ) {
      return Boolean(businessState);
    }
    // The result step is reachable once the payment ran (or the account was
    // already verified), so a failed inquiry can still show its retry form.
    if (target?.kind === 'approval') {
      return (
        Boolean(identityResult) ||
        Boolean(payload?.identity?.verified) ||
        steps.slice(0, position).every((entry) => entry.done || entry.optional === true)
      );
    }
    return steps
      .slice(0, position)
      .every((entry) => entry.done || entry.optional === true);
  }

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(next, steps.length - 1)));
  }
  function nextStep() {
    goTo(safeIndex + 1);
  }

  async function submitBusinessAndNext() {
    if (!businessFormRef.current) {
      nextStep();
      return;
    }
    // A completed business step only needs a save when the user edited it;
    // otherwise «مرحله بعد» simply moves on (legacy drafts may not revalidate).
    if (step.done && !businessFormRef.current.isDirty()) {
      nextStep();
      return;
    }
    setBusinessBusy(true);
    try {
      const saved = await businessFormRef.current.submit();
      if (!saved) return;
      await load();
      nextStep();
    } finally {
      setBusinessBusy(false);
    }
  }

  /**
   * The footer's only forward action. It performs whatever the current step
   * needs (save, select, pay, finish) and then moves to the next step.
   */
  async function advanceStep() {
    switch (step.kind) {
      case 'welcome':
      case 'details':
      case 'custom':
        if (!step.done) {
          const ok = await toggleManualStep(step);
          if (!ok) return;
        }
        nextStep();
        return;
      case 'business':
        await submitBusinessAndNext();
        return;
      case 'identity':
        if (identityVerified) {
          nextStep();
          return;
        }
        if (!identityAvailable) {
          nextStep();
          return;
        }
        if (isOptional && !identityInputsReady) {
          markIdentityOptIn(false);
          nextStep();
          return;
        }
        saveIdentityAndNext();
        return;
      case 'documents':
        if (!step.done && !isOptional && (payload?.documents?.length ?? 0) === 0) {
          toast.error('برای ادامه، حداقل یک مدرک آپلود کنید.');
          return;
        }
        nextStep();
        return;
      case 'module':
        if ((step.module?.fields?.length ?? 0) > 0) {
          const ok = await saveModuleStep(step);
          if (ok) nextStep();
          return;
        }
        if (!step.done) {
          const ok = await toggleManualStep(step);
          if (!ok) return;
        }
        nextStep();
        return;
      case 'plan':
        if (!step.done && !planSelected) {
          toast.error('برای ادامه، یک طرح اشتراک انتخاب کنید.');
          return;
        }
        nextStep();
        return;
      case 'management':
        if (step.done) {
          nextStep();
          return;
        }
        if (
          withManagement &&
          selectedManagementPackage &&
          managementAmount >= 1000
        ) {
          nextStep();
          return;
        }
        setManagementSkipped(true);
        setWithManagement(false);
        setSelectedManagementKey(null);
        nextStep();
        return;
      case 'invoice':
        if (invoiceNeedsPayment) {
          await payOnboardingInvoice();
          return;
        }
        nextStep();
        return;
      case 'approval':
        await finishOnboarding();
        return;
      default:
        nextStep();
    }
  }
  function prevStep() {
    goTo(safeIndex - 1);
  }

  return (
    <section className="onboarding-card overflow-hidden rounded-3xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] shadow-[0_24px_70px_-40px_rgba(58,40,28,0.55)] dark:shadow-[0_24px_70px_-40px_rgba(0,0,0,0.8)]">
      {/* progress header */}
      <header className="onboarding-progress relative overflow-hidden border-b border-[var(--vintage-border)] bg-gradient-to-l from-brand/15 via-brand-light/70 to-[var(--vintage-surface)] p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-16 size-48 rounded-full bg-brand/10 blur-2xl"
        />
        <div className="onboarding-progress-top relative flex flex-wrap items-center justify-between gap-3">
          <span className="onboarding-progress-title flex items-center gap-2.5 text-base font-extrabold text-ink">
            <span className="onboarding-progress-icon flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Sparkles className="size-4" aria-hidden />
            </span>
            مسیر تکمیل
          </span>
          <span className="onboarding-progress-count rounded-full bg-[var(--vintage-surface)] px-3 py-1 text-xs font-bold text-brand shadow-sm ring-1 ring-brand/10">
            مرحله‌ی {(safeIndex + 1).toLocaleString('fa-IR')} از{' '}
            {steps.length.toLocaleString('fa-IR')}
          </span>
        </div>
        <div className="onboarding-progress-track relative mt-4 h-2 overflow-hidden rounded-full bg-[var(--vintage-surface)] ring-1 ring-brand/10">
          <div
            className="onboarding-progress-fill h-full rounded-full bg-gradient-to-l from-brand to-brand-hover transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* step dots */}
        <div
          ref={stepsRef}
          className="onboarding-steps relative mt-4 flex items-center gap-2"
        >
          {steps.map((entry, position) => {
            const active = position === safeIndex;
            const unlocked = canEnter(position);
            return (
              <div
                key={entry.id}
                title={entry.title}
                aria-current={active ? 'step' : undefined}
                data-state={
                  active ? 'active' : entry.done ? 'done' : unlocked ? 'open' : 'locked'
                }
                className={cn(
                  'onboarding-step group flex flex-1 items-center gap-1.5 rounded-full border px-1.5 py-1 text-[10px] font-bold transition',
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
                    'onboarding-step-no flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]',
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
                <span className="truncate">{entry.title}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* the single step card */}
      <div className="onboarding-body bg-gradient-to-b from-[var(--vintage-surface)] to-[var(--vintage-paper)]/30 p-5 sm:p-6">
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
                'onboarding-step-icon flex size-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-extrabold shadow-sm',
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
            </div>
          ) : null}

          {step.kind === 'module' ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60 p-4">
                <p className="text-xs font-bold text-muted">ماژول این مرحله</p>
                <p className="mt-1 text-sm font-bold text-ink">{step.title}</p>
                {step.description ? (
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {step.description}
                  </p>
                ) : null}
                {step.moduleKey ? (
                  <p className="mt-2 font-mono text-[10px] text-muted" dir="ltr">
                    {step.moduleKey}
                  </p>
                ) : null}
                {step.module && step.module.price > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-brand-light/50 px-2.5 py-1.5 text-[11px] font-bold text-ink">
                    <span>هزینه‌ی این خدمت: {faPrice(step.module.price)}</span>
                    {step.module.type === 'apiir' ||
                    step.module.type === 'zohal' ? (
                      <span className="font-normal text-muted">
                        با استفاده از این خدمت، به صورتحساب نهایی اضافه می‌شود.
                      </span>
                    ) : (
                      <span className="font-normal text-muted">
                        در مرحله‌ی اشتراک/مدیریت محاسبه می‌شود.
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              {(step.module?.fields?.length ?? 0) > 0 ? (
                <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-4">
                  <p className="text-xs font-bold text-muted">
                    اطلاعات موردنیاز این مرحله
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {step.module!.fields.map((field) => {
                      const value = moduleValue(step, field);
                      const uploadKey = `${step.id}:${field.name}`;
                      return (
                        <label
                          key={field.name}
                          className="flex flex-col gap-1 text-[11px] font-bold text-muted"
                        >
                          {field.label}
                          {field.required ? ' *' : ''}
                          {field.type === 'boolean' ? (
                            <select
                              className="indeed-input mt-1 py-1.5 text-xs"
                              value={value}
                              onChange={(event) =>
                                setModuleValue(step, field, event.target.value)
                              }
                            >
                              <option value="">—</option>
                              <option value="true">بله</option>
                              <option value="false">خیر</option>
                            </select>
                          ) : field.type === 'file' ? (
                            <span className="mt-1 flex flex-col gap-1">
                              <input
                                type="file"
                                className="text-[11px]"
                                disabled={moduleUploading === uploadKey}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    void uploadModuleFile(step, field, file);
                                  }
                                }}
                              />
                              {value ? (
                                <span className="text-[10px] text-emerald-700">
                                  فایل انتخاب شده است.
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <input
                              className="indeed-input mt-1 py-1.5 text-xs"
                              dir={field.type === 'date' ? 'ltr' : undefined}
                              placeholder={field.placeholder}
                              value={value}
                              onChange={(event) =>
                                setModuleValue(step, field, event.target.value)
                              }
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="inline-flex w-fit items-center gap-1 text-xs font-bold text-brand underline underline-offset-4"
                    >
                      رفتن به این بخش
                      <ArrowLeft className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                  <p className="text-[11px] leading-6 text-muted">
                    پس از انجام این مورد، برای ادامه دکمه‌ی «مرحله بعد» را
                    بزنید.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {step.kind === 'identity' ? (
            <div className="flex flex-col gap-3">
              {!identityAvailable ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <b>استعلام هویت در حال حاضر فعال نیست.</b>
                  <p className="mt-1">
                    سرویس‌های شاهکار/استعلام هویتی توسط مدیر غیرفعال شده‌اند؛
                    این مرحله هزینه‌ای در صورتحساب ندارد و می‌توانید بدون آن
                    ادامه دهید.
                  </p>
                </div>
              ) : (
                <>
              {payload.identity?.verified ? (
                <div
                  className={cn(
                    'rounded-xl border p-4 text-xs leading-6',
                    payload.identity.businessLicenseVerified
                      ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200',
                  )}
                >
                  <b className="flex items-center gap-1.5">
                    <BadgeCheck
                      className={cn(
                        'size-4',
                        payload.identity.businessLicenseVerified && 'text-sky-600',
                      )}
                      aria-hidden
                    />
                    {payload.identity.businessLicenseVerified
                      ? 'هویت شما تأیید شد و با استعلام جواز کسب تیک آبی دریافت کردید.'
                      : 'هویت شما تأیید شد؛ تیک سفید دریافت کردید.'}
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
                    <input
                      className="indeed-input mt-1"
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="۱۳۷۰/۰۱/۰۱"
                      value={birthText}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBirthText(value);
                        const parsed = parseJalali(value);
                        setBirthIso(
                          parsed
                            ? jalaliToIso(parsed.year, parsed.month, parsed.day)
                            : '',
                        );
                      }}
                    />
                    <span className="mt-1 text-[10px] font-normal text-muted">
                      به شکل ۱۳۷۰/۰۱/۰۱ وارد کنید.
                    </span>
                  </label>
                </div>
              )}

              <div className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/50 p-3 text-[11px] leading-6 text-muted">
                با همین کد ملی، شماره‌ی اصلی حساب و همه‌ی شماره‌های کسب‌وکار
                شما با شاهکار تطبیق داده می‌شوند؛ نیازی به استعلام جداگانه‌ی هر
                شماره نیست.
              </div>

              {showLicense && !payload.identity?.businessLicenseVerified ? (
                <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-800/60 dark:bg-sky-950/30">
                  <label className="flex cursor-pointer items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition',
                        withLicense
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-[var(--vintage-border)] bg-[var(--vintage-surface)] text-transparent',
                      )}
                    >
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-ink">
                        استعلام جواز کسب و دریافت تیک آبی
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-6 text-muted">
                        اگر تیک بزنید، در همان پرداخت جواز کسب هم استعلام می‌شود و
                        در صورت تطبیق کد ملی و نام و نام خانوادگی مالک جواز با
                        هویت شما تیک آبی می‌گیرید؛ در غیر این صورت فقط تیک سفید
                        دریافت می‌کنید و دلیل عدم تعلق تیک آبی نمایش داده می‌شود.
                      </span>
                      <span className="mt-1 block text-[11px] font-bold text-sky-700 dark:text-sky-300">
                        هزینه: {faPrice(licensePrice)}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={withLicense}
                      onChange={(event) => setWithLicense(event.target.checked)}
                    />
                  </label>
                  {withLicense ? (
                    <div className="flex flex-col gap-1.5 ps-8">
                      <span className="text-xs font-bold text-muted">
                        کد پیگیری جواز کسب
                      </span>
                      <input
                        className="indeed-input"
                        dir="ltr"
                        value={licenseTrackingCode}
                        onChange={(event) =>
                          setLicenseTrackingCode(event.target.value)
                        }
                        placeholder="مثال: BL123456"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showLicense &&
              !payload.identity?.businessLicenseVerified &&
              payload.identity?.businessLicenseStatus === 'FAILED' ? (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs leading-6 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
                  <b>تیک آبی به حساب شما تعلق نگرفت.</b>
                  <p className="mt-1">
                    {payload.identity.businessLicenseMessage ??
                      'اطلاعات مالک جواز با اطلاعات هویتی تأییدشده‌ی شما مطابقت ندارد.'}
                  </p>
                  {payload.identity.businessLicenseOwnerName ? (
                    <p className="mt-1 text-[11px]">
                      مالک جواز در استعلام:{' '}
                      {payload.identity.businessLicenseOwnerName}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px]">
                    برای دریافت تیک آبی، کد پیگیری جوازی را وارد کنید که کد ملی و
                    نام و نام خانوادگی مالک آن دقیقاً با هویت تأییدشده‌ی شما
                    یکسان باشد.
                  </p>
                </div>
              ) : null}

              {!identityVerified ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <b>توجه:</b> اگر کد ملی یا تاریخ تولد را اشتباه وارد کنید،
                  هزینه‌ی استعلام قابل برگشت نیست و برای تلاش دوباره باید
                  مجدداً پرداخت کنید. استعلام پس از پرداخت نهایی انجام می‌شود و
                  نتیجه‌ی آن در پایان نمایش داده می‌شود.
                </div>
              ) : null}

              {!identityVerified ? (
                <p className="rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-3 text-[11px] leading-6 text-muted">
                  اطلاعات را وارد کنید و برای ثبت و ادامه، دکمه‌ی «مرحله بعد» را
                  بزنید.
                </p>
              ) : null}

              {walletVisible && payload.identity?.verified && debt > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/40">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    بدهی کیف پول: {faPrice(debt)} — برای تسویه به بخش «کیف پول»
                    بروید.
                  </span>
                </div>
              ) : null}
                </>
              )}
            </div>
          ) : null}

          {step.kind === 'business' ? (
            <div className="flex flex-col gap-3">
              <OnboardingBusinessForm
                ref={businessFormRef}
                defaultFullName={
                  businessState?.fullName ??
                  ([payload.identity?.firstName, payload.identity?.lastName]
                    .filter(Boolean)
                    .join(' ') || undefined)
                }
                initial={businessInitial}
                debt={walletVisible ? debt : 0}
              />
            </div>
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
                      'flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 px-3 py-2 text-[11px] font-bold text-brand transition hover:border-brand',
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
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/30 px-3 py-4 text-center text-[11px] text-muted">
                    هنوز مدرکی آپلود نکرده‌اید.
                  </p>
                )}
              </div>

            </div>
          ) : null}

          {step.kind === 'plan' ? (
            <div className="flex flex-col gap-3">
              {selectablePlans.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--vintage-border)] p-4 text-center text-xs text-muted">
                  در حال بارگذاری طرح‌ها...
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-2">
                    <span className="text-[11px] font-bold text-muted">
                      دوره‌ی پرداخت:
                    </span>
                    <select
                      value={planMonths}
                      onChange={(event) =>
                        setPlanMonths(
                          Number(event.target.value) as PlanPeriodMonths,
                        )
                      }
                      className="indeed-input w-auto py-1.5 text-[11px] font-bold"
                    >
                      {PLAN_PERIODS.map((period) => (
                        <option key={period} value={period}>
                          {PLAN_PERIOD_LABELS[period]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectablePlans.map((plan) => {
                      const isSelected = plan.id === selectedPlanId;
                      const isCurrent = plan.id === myPlanId;
                      const downgrade = currentIsPaid && isFreePlan(plan);
                      const amount = planPriceForMonths(plan, planMonths);
                      return (
                        <label
                          key={plan.id}
                          className={cn(
                            'flex cursor-pointer flex-col rounded-2xl border bg-[var(--vintage-surface)] p-4 transition',
                            isSelected
                              ? 'border-brand shadow-[0_10px_30px_-20px_rgba(139,58,26,0.6)] ring-1 ring-brand/30 dark:shadow-none'
                              : 'border-[var(--vintage-border)] hover:border-brand/40',
                            downgrade && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          <input
                            type="radio"
                            name="onboarding-plan"
                            className="sr-only"
                            checked={isSelected}
                            disabled={downgrade}
                            onChange={() => selectPlan(plan)}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-extrabold text-ink">
                              {plan.name}
                            </h3>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                                <Check className="size-3" aria-hidden />
                                انتخاب شد
                              </span>
                            ) : isCurrent ? (
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
                            {faPrice(amount)}
                            <span className="text-[10px] font-normal text-muted">
                              {' '}
                              / {PLAN_PERIOD_LABELS[planMonths]}
                            </span>
                          </p>
                          {plan.features.length ? (
                            <ul className="mt-2 flex flex-1 flex-col gap-1 text-[11px] text-ink">
                              {plan.features.slice(0, 4).map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-1.5"
                                >
                                  <Check
                                    className="mt-0.5 size-3 shrink-0 text-brand"
                                    aria-hidden
                                  />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <span
                            className={cn(
                              'mt-3 inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-[11px] font-bold',
                              isSelected
                                ? 'border-brand bg-brand-light text-brand'
                                : 'border-[var(--vintage-border)] text-muted',
                            )}
                          >
                            {downgrade
                              ? 'امکان تنزل به رایگان نیست'
                              : isSelected
                                ? 'انتخاب شد'
                                : 'برای انتخاب کلیک کنید'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
              <p className="text-[10px] leading-5 text-muted">
                مبلغ این مرحله در پایان و همراه با استعلام هویت و بسته‌ی مدیریت
                با یک پرداخت آنلاین تسویه می‌شود.
              </p>
            </div>
          ) : null}

          {step.kind === 'management' ? (
            <div className="flex flex-col gap-3">
              {!selectedPlan ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  ابتدا در مرحله‌ی قبل یک اشتراک انتخاب کنید تا قیمت بسته‌های
                  مدیریت نمایش داده شود.
                </p>
              ) : null}
              {showManagement ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {managementPackages.map((pkg) => {
                    const description = catalogIndustries.find(
                      (entry) => entry.key === pkg.key,
                    )?.description;
                    const isSelected =
                      withManagement && selectedManagementKey === pkg.key;
                    const disabled =
                      !pkg.available || !selectedPlan || isFreePlan(selectedPlan);
                    return (
                      <label
                        key={pkg.key}
                        className={cn(
                          'flex flex-col rounded-2xl border p-4 text-right transition',
                          isSelected
                            ? 'border-brand bg-brand-light/40 ring-1 ring-brand/30'
                            : 'border-[var(--vintage-border)] bg-[var(--vintage-surface)] hover:border-brand/40',
                          disabled && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => {
                            if (isSelected) {
                              setWithManagement(false);
                              setSelectedManagementKey(null);
                            } else {
                              setSelectedManagementKey(pkg.key);
                              setWithManagement(true);
                              setManagementSkipped(false);
                            }
                          }}
                        />
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-ink">
                            {pkg.label}
                          </span>
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                              <Check className="size-3" aria-hidden />
                              انتخاب شد
                            </span>
                          ) : null}
                        </span>
                        {description ? (
                          <span className="mt-1 block text-[11px] leading-5 text-muted">
                            {description}
                          </span>
                        ) : null}
                        <span className="mt-2 block text-sm font-extrabold text-brand">
                          {pkg.amount > 0 ? faPrice(pkg.amount) : 'در حال محاسبه…'}
                          <span className="text-[10px] font-normal text-muted">
                            {' '}
                            / {PLAN_PERIOD_LABELS[planMonths]}
                          </span>
                        </span>
                        {disabled ? (
                          <span className="mt-1 block text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            با اشتراک رایگان قابل خرید نیست؛ اکو یا بلاس انتخاب کنید.
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-4 text-xs leading-6 text-muted">
                  فعلاً بسته‌ی مدیریت کسب‌وکاری برای خرید تعریف نشده است؛
                  می‌توانید بدون آن ادامه دهید.
                </p>
              )}
              <p className="text-[11px] leading-6 text-muted">
                برای افزودن بسته روی آن کلیک کنید؛ اگر بسته‌ای انتخاب نکنید، با
                دکمه‌ی «مرحله بعد» بدون بسته ادامه می‌دهید.
              </p>
            </div>
          ) : null}

          {step.kind === 'invoice' ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60 px-4 py-2.5">
                  <span className="text-xs font-extrabold text-ink">
                    صورتحساب نهایی
                  </span>
                  <span className="text-[10px] font-bold text-muted">
                    یک پرداخت برای همه‌ی موارد
                  </span>
                </div>
                <ul className="divide-y divide-[var(--vintage-border)]">
                  {identityChargeable && identityTotal > 0 ? (
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-muted">
                        <ShieldCheck className="size-3.5 text-brand" aria-hidden />
                        استعلام هویت و تطبیق موبایل
                      </span>
                      <span className="font-bold text-ink">
                        {faPrice(identityTotal)}
                      </span>
                    </li>
                  ) : null}
                  {licenseChargeable ? (
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-muted">
                        <ShieldCheck className="size-3.5 text-sky-600" aria-hidden />
                        استعلام جواز کسب (تیک آبی)
                      </span>
                      <span className="font-bold text-ink">
                        {faPrice(licensePrice)}
                      </span>
                    </li>
                  ) : null}
                  {selectedPlan ? (
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-muted">
                        <Crown className="size-3.5 text-brand" aria-hidden />
                        اشتراک {selectedPlan.name} —{' '}
                        {PLAN_PERIOD_LABELS[planMonths]}
                      </span>
                      <span className="font-bold text-ink">
                        {faPrice(planAmount)}
                      </span>
                    </li>
                  ) : null}
                  {includeManagement ? (
                    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-muted">
                        <Building2 className="size-3.5 text-brand" aria-hidden />
                        مدیریت {selectedManagementPackage?.label}
                      </span>
                      <span className="font-bold text-ink">
                        {faPrice(managementAmount)}
                      </span>
                    </li>
                  ) : null}
                  {cart.map((item) => (
                    <li
                      key={item.stepId}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                    >
                      <span className="flex items-center gap-2 text-muted">
                        <Sparkles className="size-3.5 text-brand" aria-hidden />
                        {item.label}
                      </span>
                      <span className="font-bold text-ink">
                        {faPrice(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-[var(--vintage-border)] bg-brand-light/40 px-4 py-2.5 text-xs">
                  <span className="font-extrabold text-ink">مبلغ قابل پرداخت</span>
                  <span className="font-extrabold text-brand">
                    {faPrice(invoiceTotalAmount)}
                  </span>
                </div>
              </div>
              {!selectedPlan && !identityPayable ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  موردی برای پرداخت باقی نمانده است؛ با دکمه‌ی «مرحله بعد» به
                  نتیجه‌ی استعلام بروید.
                </p>
              ) : null}
              {!selectedPlan && identityPayable ? (
                <p className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-[11px] leading-6 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-200">
                  اشتراکی برای این صورتحساب انتخاب نشده است؛ فقط هزینه‌ی استعلام
                  هویت پرداخت می‌شود.
                </p>
              ) : null}
              {invoiceNeedsPayment ? (
                <p className="rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-3 text-[11px] leading-6 text-muted">
                  برای پرداخت نهایی، دکمه‌ی «مرحله بعد» را بزنید.
                </p>
              ) : null}
              <p className="text-[10px] leading-5 text-muted">
                با پرداخت، اشتراک و بسته‌ی مدیریت فعال می‌شوند و استعلام هویت
                بلافاصله پس از تأیید پرداخت انجام می‌شود.
              </p>
            </div>
          ) : null}

          {step.kind === 'approval' ? (
            canEnter(safeIndex) ? (
              <div className="flex flex-col gap-3">
                {identityResult && !identityResult.success ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-800/60 dark:bg-red-950/30">
                    <b className="flex items-center gap-1.5 text-sm text-red-700 dark:text-red-300">
                      <ShieldCheck className="size-4" aria-hidden />
                      استعلام هویت انجام نشد
                    </b>
                    <p className="text-xs leading-6 text-red-700 dark:text-red-200">
                      {identityResult.message ??
                        'اطلاعات وارد‌شده با استعلام مطابقت نداشت.'}{' '}
                      هزینه‌ی استعلام قابل برگشت نیست؛ برای تلاش دوباره از بخش
                      «پروفایل» اقدام کنید.
                    </p>
                  </div>
                ) : identityVerified ? (
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 via-emerald-50/70 to-[var(--vintage-surface)] p-5 text-center dark:border-emerald-800/60 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-[var(--vintage-surface)]">
                    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <PartyPopper className="size-7" aria-hidden />
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-emerald-900 dark:text-emerald-100">
                      تبریک! ثبت‌نام شما کامل شد
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-emerald-800 dark:text-emerald-200">
                      {payload.identity?.businessLicenseVerified
                        ? 'هویت و جواز کسب شما تأیید شد و تیک آبی گرفتید.'
                        : 'هویت شما تأیید شد و تیک سفید گرفتید.'}{' '}
                      کسب‌وکار شما پس از تأیید مدیر در صفحه‌ی مشاغل و دایرکتوری
                      نمایش داده می‌شود.
                    </p>
                    {!payload.identity?.businessLicenseVerified &&
                    payload.identity?.businessLicenseStatus === 'FAILED' ? (
                      <p className="mx-auto mt-2 max-w-md rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-6 text-red-700 dark:bg-red-950/40 dark:text-red-200">
                        {payload.identity.businessLicenseMessage ??
                          'اطلاعات مالک جواز با اطلاعات هویتی شما مطابقت نداشت؛ تیک آبی صادر نشد.'}
                      </p>
                    ) : null}
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--vintage-surface)] px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-800/60">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {payload.identity?.businessLicenseVerified
                        ? 'تیک آبی'
                        : 'تیک سفید'}
                    </span>
                  </div>
                ) : identityExpected ? (
                  <div className="rounded-2xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-5 text-center text-xs leading-6 text-muted">
                    نتیجه‌ی استعلام هویت در حال بررسی است؛ چند لحظه بعد این صفحه
                    را دوباره باز کنید.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-5 text-center text-xs leading-6 text-muted">
                    استعلام هویت در این مسیر انجام نشده است. در صورت نیاز می‌توانید
                    آن را از بخش پروفایل انجام دهید.
                  </div>
                )}

                <p className="rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-3 text-[11px] leading-6 text-muted">
                  برای پایان و بازگشت به داشبورد، دکمه‌ی «مرحله بعد» را بزنید.
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-5 text-center text-xs leading-6 text-muted">
                این پیام پس از تکمیل همه‌ی مراحل قبلی نمایش داده می‌شود.
              </p>
            )
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* footer navigation                                                */}
          {/* ---------------------------------------------------------------- */}
          <div className="onboarding-footer mt-1 flex items-center justify-between gap-3 border-t border-dashed border-[var(--vintage-border)] pt-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={isFirst || navBusy}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              <ArrowRight className="size-4" aria-hidden />
              مرحله قبل
            </button>
            <div className="flex items-center gap-3">
              {isLast ? (
                <span className="hidden text-[10px] font-bold text-muted sm:inline">
                  آخرین مرحله
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void advanceStep()}
                disabled={navBusy}
                className="indeed-btn indeed-btn-primary py-2 text-xs disabled:opacity-50"
              >
                {navBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                مرحله بعد
                <ArrowLeft className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {payload.history?.length ? (
        <details className="group border-t border-[var(--vintage-border)] bg-[var(--vintage-paper)]/60">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-3.5 text-xs font-bold text-ink [&::-webkit-details-marker]:hidden">
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
        </details>
      ) : null}
    </section>
  );
}
