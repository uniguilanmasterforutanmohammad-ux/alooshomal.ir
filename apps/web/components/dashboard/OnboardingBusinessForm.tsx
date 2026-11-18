'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Save,
  Wallet,
} from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { api, type TaxonomyItem } from '@/lib/api';
import { toast } from '@/lib/toast';

/** The draft the onboarding business step keeps on the workspace. */
export interface OnboardingBusinessDraft {
  name: string;
  fullName: string;
  cityId: string;
  businessId: string;
  mobile: string;
  address: string;
}

const EMPTY: OnboardingBusinessDraft = {
  name: '',
  fullName: '',
  cityId: '',
  businessId: '',
  mobile: '',
  address: '',
};

function faPrice(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

interface Props {
  /** identity name from the inquiry, used to prefill the manager name */
  defaultFullName?: string;
  /** existing workspace draft (so a returning user sees their data) */
  initial?: OnboardingBusinessDraft | null;
  /** outstanding wallet debt (positive toman amount) */
  debt: number;
  paying: boolean;
  onPay: () => void;
  /** called after a successful save so the wizard can refresh its progress */
  onSaved: () => void;
}

/**
 * Step 2 of «شروع آسان» — creates the business workspace only.
 *
 * It collects the essentials (title, manager, category, city, mobile, address)
 * and posts them to `POST /onboarding/business`, which creates/updates the
 * workspace and keeps the raw draft for the later card builder. No business
 * card and no biolink are created here; those are completed from the panel
 * after onboarding.
 */
export function OnboardingBusinessForm({
  defaultFullName,
  initial,
  debt,
  paying,
  onPay,
  onSaved,
}: Props) {
  const [values, setValues] = useState<OnboardingBusinessDraft>(EMPTY);
  const [cities, setCities] = useState<TaxonomyItem[]>([]);
  const [businesses, setBusinesses] = useState<TaxonomyItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      try {
        const [cityList, businessList] = await Promise.all([
          api.get<TaxonomyItem[]>('/cities').catch(() => []),
          api.get<TaxonomyItem[]>('/businesses').catch(() => []),
        ]);
        setCities(cityList);
        setBusinesses(businessList);
        if (initial) {
          setValues({
            name: initial.name ?? '',
            fullName: initial.fullName ?? '',
            cityId: initial.cityId ?? '',
            businessId: initial.businessId ?? '',
            mobile: initial.mobile ?? '',
            address: initial.address ?? '',
          });
          setSaved(Boolean(initial.name));
        } else {
          setValues((prev) => ({
            ...prev,
            fullName: prev.fullName || defaultFullName || '',
          }));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [initial, defaultFullName]);

  function setField<K extends keyof OnboardingBusinessDraft>(
    key: K,
    value: OnboardingBusinessDraft[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!values.name.trim()) {
      toast.error('عنوان کسب‌وکار الزامی است.');
      return;
    }
    if (!values.businessId.trim()) {
      toast.error('دسته‌بندی کسب‌وکار را انتخاب کنید.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/onboarding/business', {
        name: values.name.trim(),
        fullName: values.fullName.trim() || undefined,
        cityId: values.cityId.trim() || undefined,
        businessId: values.businessId.trim() || undefined,
        mobile: values.mobile.trim() || undefined,
        address: values.address.trim() || undefined,
      });
      setSaved(true);
      toast.success('کسب‌وکار شما ساخته شد. مرحله‌ی بعد: استعلام هویت.');
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ساخت کسب‌وکار ناموفق بود',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4 text-xs text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        در حال بارگذاری اطلاعات کسب‌وکار...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {debt > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/40">
          <Wallet className="size-5 text-amber-600 dark:text-amber-300" aria-hidden />
          <p className="min-w-0 flex-1 text-xs leading-6 text-amber-800 dark:text-amber-200">
            برای ثبت کسب‌وکار ابتدا بدهی کیف پول را تسویه کنید.
            <b className="ms-1">بدهی فعلی: {faPrice(debt)}</b>
          </p>
          <button
            type="button"
            onClick={onPay}
            disabled={paying}
            className="indeed-btn indeed-btn-primary py-2 text-xs"
          >
            <CreditCard className="size-4" aria-hidden />
            {paying ? 'در حال انتقال...' : 'پرداخت آنلاین'}
          </button>
        </div>
      ) : null}

      {saved ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <Check className="size-4" aria-hidden />
          <span>
            کسب‌وکار «{values.name}» ساخته شد؛ کارت ویزیت و بیولینک را بعداً از
            پنل تکمیل می‌کنید.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Building2 className="size-4 text-brand" aria-hidden />
          عنوان و اطلاعات اصلی
        </h3>
        <p className="mt-1 text-[11px] leading-6 text-muted">
          در این مرحله فقط کسب‌وکار ساخته می‌شود؛ کارت ویزیت، بیولینک و بقیه‌ی
          مشخصات را بعداً از پنل تکمیل می‌کنید.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="عنوان کسب‌وکار *"
            required
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
          />
          <Input
            label="نام مدیر یا مسئول"
            value={values.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">دسته‌بندی کسب‌وکار *</span>
            <select
              required
              className="indeed-input"
              value={values.businessId}
              onChange={(event) => setField('businessId', event.target.value)}
            >
              <option value="">انتخاب دسته‌بندی...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">شهر</span>
            <select
              className="indeed-input"
              value={values.cityId}
              onChange={(event) => setField('cityId', event.target.value)}
            >
              <option value="">انتخاب شهر...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="شماره موبایل"
            dir="ltr"
            inputMode="tel"
            value={values.mobile}
            onChange={(event) => setField('mobile', event.target.value)}
          />
          <div className="md:col-span-2">
            <Input
              label="آدرس (حداکثر یک خط)"
              maxLength={120}
              value={values.address}
              onChange={(event) => setField('address', event.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting || debt > 0}
        className="indeed-btn indeed-btn-primary self-start"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Save className="size-4" aria-hidden />
        )}
        {submitting
          ? 'در حال ذخیره...'
          : saved
            ? 'ذخیره‌ی تغییرات کسب‌وکار'
            : 'ساخت کسب‌وکار'}
      </button>
      {debt > 0 ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          پس از تسویه‌ی بدهی، همین دکمه فعال می‌شود.
        </p>
      ) : null}
    </div>
  );
}
