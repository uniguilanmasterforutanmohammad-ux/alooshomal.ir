'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Loader2,
  Phone,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { api, type TaxonomyItem } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/** The draft the onboarding business step keeps on the workspace. */
export interface OnboardingBusinessDraft {
  name: string;
  fullName: string;
  cityId: string;
  businessId: string;
  mobile: string;
  additionalMobiles: string[];
  address: string;
}

const EMPTY: OnboardingBusinessDraft = {
  name: '',
  fullName: '',
  cityId: '',
  businessId: '',
  mobile: '',
  additionalMobiles: [],
  address: '',
};

interface VerifiedPhone {
  phone: string;
  nationalCode: string | null;
  verifiedAt: string | null;
  source: 'ACCOUNT' | 'SHAHKAR';
}

interface ProfilePhonePayload {
  phone: string | null;
  nationalCode: string | null;
  verifiedPhones?: VerifiedPhone[];
}

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
}

/** Imperative API used by the wizard's single «مرحله بعد» button. */
export interface OnboardingBusinessFormHandle {
  submit: () => Promise<boolean>;
  /** Whether the form differs from the values it was loaded with. */
  isDirty: () => boolean;
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
export const OnboardingBusinessForm = forwardRef<
  OnboardingBusinessFormHandle,
  Props
>(function OnboardingBusinessForm(
  { defaultFullName, initial, debt },
  ref,
) {
  const [values, setValues] = useState<OnboardingBusinessDraft>(EMPTY);
  const [cities, setCities] = useState<TaxonomyItem[]>([]);
  const [businesses, setBusinesses] = useState<TaxonomyItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPhones, setVerifiedPhones] = useState<VerifiedPhone[]>([]);
  const initialized = useRef(false);
  const baseline = useRef<string>('');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      try {
        const [cityList, businessList, profile] = await Promise.all([
          api.get<TaxonomyItem[]>('/cities').catch(() => []),
          api.get<TaxonomyItem[]>('/businesses').catch(() => []),
          api.get<ProfilePhonePayload>('/profile/me').catch(() => null),
        ]);
        setCities(cityList);
        setBusinesses(businessList);
        setVerifiedPhones(profile?.verifiedPhones ?? []);
        if (initial) {
          const nextValues: OnboardingBusinessDraft = {
            name: initial.name ?? '',
            fullName: initial.fullName ?? '',
            cityId: initial.cityId ?? '',
            businessId: initial.businessId ?? '',
            mobile: initial.mobile || profile?.phone || '',
            additionalMobiles: initial.additionalMobiles ?? [],
            address: initial.address ?? '',
          };
          baseline.current = JSON.stringify(nextValues);
          setValues(nextValues);
          setSaved(Boolean(initial.name));
        } else {
          setValues((prev) => {
            const nextValues = {
              ...prev,
              fullName: prev.fullName || defaultFullName || '',
              mobile: prev.mobile || profile?.phone || '',
            };
            baseline.current = JSON.stringify(nextValues);
            return nextValues;
          });
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

  const primaryMobileVerified =
    Boolean(values.mobile) &&
    verifiedPhones.some((entry) => entry.phone === values.mobile);
  const verifiedPhoneSet = new Set(verifiedPhones.map((entry) => entry.phone));

  async function submit(): Promise<boolean> {
    if (!values.name.trim()) {
      toast.error('عنوان کسب‌وکار الزامی است.');
      return false;
    }
    if (!values.businessId.trim()) {
      toast.error('دسته‌بندی کسب‌وکار را انتخاب کنید.');
      return false;
    }
    if (debt > 0) {
      toast.error('برای ثبت کسب‌وکار ابتدا بدهی کیف پول را تسویه کنید.');
      return false;
    }
    setError(null);
    try {
      // Older drafts may hold a malformed mobile; skip it instead of blocking
      // the whole save (the number is read-only in this step).
      const validMobile = /^09\d{9}$/.test(values.mobile.trim())
        ? values.mobile.trim()
        : undefined;
      await api.post('/onboarding/business', {
        name: values.name.trim(),
        fullName: values.fullName.trim() || undefined,
        cityId: values.cityId.trim() || undefined,
        businessId: values.businessId.trim() || undefined,
        mobile: validMobile,
        additionalMobiles: values.additionalMobiles.filter((entry) =>
          /^09\d{9}$/.test(entry.trim()),
        ),
        address: values.address.trim() || undefined,
      });
      setSaved(true);
      baseline.current = JSON.stringify(values);
      toast.success('کسب‌وکار شما ساخته شد. مرحله‌ی بعد: استعلام هویت.');
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ساخت کسب‌وکار ناموفق بود',
      );
      return false;
    }
  }

  useImperativeHandle(ref, () => ({
    submit,
    isDirty: () => JSON.stringify(values) !== baseline.current,
  }));

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
            برای ثبت کسب‌وکار ابتدا بدهی کیف پول را از بخش «کیف پول» تسویه کنید.
            <b className="ms-1">بدهی فعلی: {faPrice(debt)}</b>
          </p>
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
            label="شماره موبایل کسب‌وکار"
            dir="ltr"
            inputMode="tel"
            value={values.mobile}
            readOnly
            aria-readonly="true"
            className="!bg-[var(--vintage-paper)] !text-ink font-bold cursor-not-allowed focus:!border-[var(--vintage-border)] focus:!shadow-none"
            hint="شماره‌ی ثبت‌شده‌ی حساب شما؛ غیرقابل ویرایش است. شماره‌های کسب‌وکار در مرحله‌ی «استعلام هویت» با کد ملی بررسی می‌شوند."
          />
          <div className="md:col-span-2 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-ink">
              <Phone className="size-4 text-brand" aria-hidden />
              شماره‌های موبایل کسب‌وکار
            </p>
            <p className="mt-1 text-[11px] leading-6 text-muted">
              شماره‌ی اصلی حساب از قبل تأیید شده است. شماره‌های کسب‌وکار در
              مرحله‌ی «استعلام هویت» با کد ملی شما با شاهکار بررسی می‌شوند.
            </p>
            {values.mobile && !primaryMobileVerified ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                این شماره هنوز با شاهکار تأیید نشده است؛ در مرحله‌ی «استعلام
                هویت» با کد ملی شما بررسی می‌شود.
              </p>
            ) : null}

            {verifiedPhones.length > 0 ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-muted">
                  شماره‌های تأییدشده‌ی شما:
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {verifiedPhones.map((entry) => (
                    <li
                      key={entry.phone}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-[11px]"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck
                          className="size-3.5 text-emerald-600"
                          aria-hidden
                        />
                        <span dir="ltr" className="font-bold text-ink">
                          {entry.phone}
                        </span>
                        <span className="text-muted">
                          {entry.source === 'ACCOUNT'
                            ? 'شماره‌ی حساب'
                            : 'تأیید شاهکار'}
                        </span>
                      </span>
                      {entry.phone === values.mobile ? (
                        <span className="text-[10px] font-bold text-emerald-700">
                          شماره اصلی فعلی
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {values.additionalMobiles.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {values.additionalMobiles.map((phone) => (
                  <li
                    key={phone}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 text-ink">
                      {verifiedPhoneSet.has(phone) ? (
                        <ShieldCheck
                          className="size-3.5 text-emerald-600"
                          aria-hidden
                        />
                      ) : (
                        <Phone
                          className="size-3.5 text-amber-600"
                          aria-hidden
                        />
                      )}
                      <span dir="ltr">{phone}</span>
                      <span
                        className={cn(
                          'text-[10px]',
                          verifiedPhoneSet.has(phone)
                            ? 'text-emerald-700'
                            : 'text-amber-700',
                        )}
                      >
                        {verifiedPhoneSet.has(phone)
                          ? 'تأییدشده با شاهکار'
                          : 'در انتظار استعلام در مرحله‌ی هویت'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
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

      <p className="text-[11px] leading-6 text-muted">
        برای ثبت اطلاعات و رفتن به مرحله‌ی بعد، از دکمه‌ی «مرحله بعد» استفاده
        کنید.
      </p>
    </div>
  );
});
