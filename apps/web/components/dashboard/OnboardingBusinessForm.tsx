'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
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
  const [accountNationalCode, setAccountNationalCode] = useState('');
  const [verifiedPhones, setVerifiedPhones] = useState<VerifiedPhone[]>([]);
  const [mobileMode, setMobileMode] = useState<'change' | 'add' | null>(null);
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyNationalCode, setVerifyNationalCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const initialized = useRef(false);

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
        setAccountNationalCode(profile?.nationalCode ?? '');
        setVerifiedPhones(profile?.verifiedPhones ?? []);
        setVerifyNationalCode(profile?.nationalCode ?? '');
        if (initial) {
          setValues({
            name: initial.name ?? '',
            fullName: initial.fullName ?? '',
            cityId: initial.cityId ?? '',
            businessId: initial.businessId ?? '',
            mobile: initial.mobile || profile?.phone || '',
            additionalMobiles: initial.additionalMobiles ?? [],
            address: initial.address ?? '',
          });
          setSaved(Boolean(initial.name));
        } else {
          setValues((prev) => ({
            ...prev,
            fullName: prev.fullName || defaultFullName || '',
            mobile: prev.mobile || profile?.phone || '',
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

  function openMobileMode(mode: 'change' | 'add') {
    setMobileMode(mode);
    setVerifyPhone(mode === 'change' ? values.mobile : '');
    setVerifyNationalCode(accountNationalCode);
    setVerifyError(null);
  }

  function applyVerifiedPhone(phone: string, mode: 'change' | 'add') {
    if (mode === 'change') {
      setField('mobile', phone);
    } else {
      setValues((prev) => ({
        ...prev,
        additionalMobiles:
          prev.additionalMobiles.includes(phone) || phone === prev.mobile
            ? prev.additionalMobiles
            : [...prev.additionalMobiles, phone],
      }));
    }
    setMobileMode(null);
  }

  const primaryMobileVerified =
    Boolean(values.mobile) &&
    verifiedPhones.some((entry) => entry.phone === values.mobile);

  async function verifyMobile() {
    if (!/^09\d{9}$/.test(verifyPhone.trim())) {
      setVerifyError('شماره موبایل معتبر نیست (مثال: 09123456789).');
      return;
    }
    if (!/^\d{10}$/.test(verifyNationalCode.trim())) {
      setVerifyError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    try {
      const result = await api.post<{
        matched: boolean;
        phone: string;
        nationalCode: string;
        cached?: boolean;
      }>('/profile/phones/verify', {
        phone: verifyPhone.trim(),
        nationalCode: verifyNationalCode.trim(),
      });
      const phone = result.phone;
      setAccountNationalCode(result.nationalCode);
      setVerifiedPhones((prev) =>
        prev.some((entry) => entry.phone === phone)
          ? prev
          : [
              {
                phone,
                nationalCode: result.nationalCode,
                verifiedAt: new Date().toISOString(),
                source: 'SHAHKAR',
              },
              ...prev,
            ],
      );
      if (mobileMode === 'change') {
        setField('mobile', phone);
      } else {
        setValues((prev) => ({
          ...prev,
          additionalMobiles: prev.additionalMobiles.includes(phone)
            ? prev.additionalMobiles
            : [...prev.additionalMobiles, phone],
        }));
      }
      toast.success(
        result.cached
          ? 'این شماره قبلاً با شاهکار تأیید شده بود.'
          : 'شماره موبایل با شاهکار تأیید شد.',
      );
      setMobileMode(null);
      setVerifyPhone('');
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : 'استعلام شاهکار ناموفق بود',
      );
    } finally {
      setVerifying(false);
    }
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
        additionalMobiles: values.additionalMobiles,
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
            label="شماره موبایل کسب‌وکار"
            dir="ltr"
            inputMode="tel"
            value={values.mobile}
            readOnly
            hint="شماره‌ی ثبت‌شده‌ی حساب شما؛ برای تغییر، از دکمه‌های زیر استفاده کنید."
          />
          <div className="md:col-span-2 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-ink">
              <Phone className="size-4 text-brand" aria-hidden />
              شماره‌های موبایل کسب‌وکار
            </p>
            <p className="mt-1 text-[11px] leading-6 text-muted">
              شماره‌ی موبایل جدید نیز باید به نام کاربر باشد و با استعلام شاهکار
              (کد ملی + شماره موبایل) تأیید شود. شماره‌ی اصلی حساب از قبل تأیید
              شده است و بدون استعلام مجدد قابل استفاده است.
            </p>
            {values.mobile && !primaryMobileVerified ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-6 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                این شماره هنوز با شاهکار تأیید نشده است؛ برای ذخیره‌ی کسب‌وکار،
                ابتدا آن را از دکمه‌ی «تغییر شماره موبایل» استعلام کنید.
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openMobileMode('change')}
                className="indeed-btn indeed-btn-secondary py-2 text-xs"
              >
                <Phone className="size-4" aria-hidden />
                تغییر شماره موبایل
              </button>
              <button
                type="button"
                onClick={() => openMobileMode('add')}
                className="indeed-btn indeed-btn-secondary py-2 text-xs"
              >
                <Plus className="size-4" aria-hidden />
                افزودن شماره موبایل
              </button>
            </div>

            {verifiedPhones.length > 0 ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-muted">
                  شماره‌های تأییدشده‌ی شما (قابل استفاده بدون استعلام مجدد):
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {verifiedPhones.map((entry) => (
                    <li
                      key={entry.phone}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-[11px]"
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
                      <span className="flex items-center gap-1">
                        {entry.phone !== values.mobile ? (
                          <button
                            type="button"
                            onClick={() => applyVerifiedPhone(entry.phone, 'change')}
                            className="rounded-md border border-[var(--vintage-border)] px-2 py-1 text-[10px] font-bold text-brand hover:border-brand"
                          >
                            شماره اصلی
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700">
                            شماره اصلی فعلی
                          </span>
                        )}
                        {entry.phone !== values.mobile &&
                        !values.additionalMobiles.includes(entry.phone) ? (
                          <button
                            type="button"
                            onClick={() => applyVerifiedPhone(entry.phone, 'add')}
                            className="rounded-md border border-[var(--vintage-border)] px-2 py-1 text-[10px] font-bold text-brand hover:border-brand"
                          >
                            + افزودن
                          </button>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {mobileMode ? (
              <div className="mt-3 rounded-xl border border-brand/30 bg-[var(--vintage-surface)] p-3">
                <p className="text-xs font-extrabold text-ink">
                  {mobileMode === 'change'
                    ? 'استعلام شاهکار برای شماره‌ی جدید'
                    : 'استعلام شاهکار برای شماره‌ی اضافه'}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="کد ملی صاحب شماره"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={10}
                    value={verifyNationalCode}
                    readOnly={Boolean(accountNationalCode)}
                    onChange={(event) =>
                      setVerifyNationalCode(
                        event.target.value.replace(/\D/g, ''),
                      )
                    }
                  />
                  <Input
                    label="شماره موبایل جدید"
                    dir="ltr"
                    inputMode="tel"
                    maxLength={11}
                    value={verifyPhone}
                    onChange={(event) =>
                      setVerifyPhone(
                        event.target.value.replace(/[^\d+]/g, ''),
                      )
                    }
                    placeholder="09123456789"
                  />
                </div>
                {verifyError ? (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700">
                    {verifyError}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void verifyMobile()}
                    disabled={verifying}
                    className="indeed-btn indeed-btn-primary py-2 text-xs"
                  >
                    {verifying ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ShieldCheck className="size-4" aria-hidden />
                    )}
                    {verifying ? 'در حال استعلام...' : 'استعلام شاهکار'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileMode(null)}
                    className="indeed-btn indeed-btn-secondary py-2 text-xs"
                  >
                    انصراف
                  </button>
                </div>
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
                      <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
                      <span dir="ltr">{phone}</span>
                      <span className="text-[10px] text-muted">تأییدشده با شاهکار</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          additionalMobiles: prev.additionalMobiles.filter(
                            (entry) => entry !== phone,
                          ),
                        }))
                      }
                      className="rounded-md p-1 text-red-600 hover:bg-red-50"
                      aria-label="حذف شماره"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
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
