'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SocialInput } from '@/components/ui/SocialInput';
import {
  api,
  type Biolink,
  type BusinessCard,
  type Paged,
  type TaxonomyItem,
} from '@/lib/api';
import { SOCIAL_FIELDS } from '@/lib/social-fields';
import { toast } from '@/lib/toast';

interface Values {
  jobTitle: string;
  fullName: string;
  cityId: string;
  businessId: string;
  mobile: string;
  address: string;
  bio: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  telegram: string;
  whatsapp: string;
  linkedin: string;
  twitter: string;
}

const EMPTY_VALUES: Values = {
  jobTitle: '',
  fullName: '',
  cityId: '',
  businessId: '',
  mobile: '',
  address: '',
  bio: '',
  phone: '',
  email: '',
  website: '',
  instagram: '',
  telegram: '',
  whatsapp: '',
  linkedin: '',
  twitter: '',
};

/** Fields a biolink accepts (the business card also has gallery/working hours). */
const BIOLINK_FIELDS: Array<keyof Values> = [
  'fullName',
  'jobTitle',
  'bio',
  'phone',
  'mobile',
  'email',
  'website',
  'address',
  'instagram',
  'telegram',
  'whatsapp',
  'linkedin',
  'twitter',
  'cityId',
  'businessId',
];

const REQUIRED: Array<keyof Values> = [
  'jobTitle',
  'fullName',
  'cityId',
  'businessId',
  'mobile',
  'address',
];

function faPrice(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

function toPayload(values: Values): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim() !== ''),
  );
}

interface Props {
  /** identity name from the inquiry, used to prefill the manager name */
  defaultFullName?: string;
  /** outstanding wallet debt (positive toman amount) */
  debt: number;
  paying: boolean;
  onPay: () => void;
  /** called after a successful save so the wizard can refresh its progress */
  onSaved: () => void;
}

/**
 * Inline «عنوان کسب‌وکار / مشخصات» form for the onboarding wizard.
 *
 * Collects everything the business card, the directory listing and the biolink
 * need in one place, then persists it into each entity: the card is created or
 * updated, and the owner's biolink is created (or linked) from the same data.
 * This keeps the user inside `/dashboard/onboarding` instead of sending them
 * to the dedicated builders.
 */
export function OnboardingBusinessForm({
  defaultFullName,
  debt,
  paying,
  onPay,
  onSaved,
}: Props) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [cities, setCities] = useState<TaxonomyItem[]>([]);
  const [businesses, setBusinesses] = useState<TaxonomyItem[]>([]);
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cityList, businessList, mine, biolinkPage] = await Promise.all([
        api.get<TaxonomyItem[]>('/cities').catch(() => []),
        api.get<TaxonomyItem[]>('/businesses').catch(() => []),
        api
          .get<Paged<BusinessCard>>('/business-cards/mine?page=1&limit=1')
          .catch(() => null),
        api
          .get<Paged<Biolink>>('/biolinks/mine?page=1&limit=20')
          .catch(() => null),
      ]);
      setCities(cityList);
      setBusinesses(businessList);
      setBiolinks(biolinkPage?.items ?? []);
      const current = mine?.items?.[0] ?? null;
      setCard(current);
      if (current) {
        setValues({
          jobTitle: current.jobTitle ?? '',
          fullName: current.fullName ?? '',
          cityId: current.cityId ?? '',
          businessId: current.businessId ?? '',
          mobile: current.mobile ?? '',
          address: current.address ?? '',
          bio: current.bio ?? '',
          phone: current.phone ?? '',
          email: current.email ?? '',
          website: current.website ?? '',
          instagram: current.instagram ?? '',
          telegram: current.telegram ?? '',
          whatsapp: current.whatsapp ?? '',
          linkedin: current.linkedin ?? '',
          twitter: current.twitter ?? '',
        });
      } else {
        setValues((prev) => ({
          ...prev,
          fullName: prev.fullName || defaultFullName || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [defaultFullName]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void load();
  }, [load]);

  function setField<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    const missing = REQUIRED.filter((key) => !values[key].trim());
    if (missing.length > 0) {
      toast.error('عنوان کسب‌وکار، نام مدیر، شهر، دسته‌بندی، موبایل و آدرس اجباری هستند.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = toPayload(values);
      const saved = card
        ? await api.patch<BusinessCard>(`/business-cards/${card.id}`, payload)
        : await api.post<BusinessCard>('/business-cards', payload);
      setCard(saved);

      // Mirror the same data into the owner's biolink so the «بیولینک» and the
      // «صفحه مشاغل» are filled from one place. Failures here never discard the
      // saved business card.
      let biolinkNote = '';
      try {
        if (biolinks.length === 0) {
          const biolinkPayload = Object.fromEntries(
            BIOLINK_FIELDS.map((key) => [key, values[key]]).filter(
              ([, value]) => String(value).trim() !== '',
            ),
          );
          await api.post('/biolinks', {
            ...biolinkPayload,
            businessCardId: saved.id,
          });
          biolinkNote = ' بیولینک شما هم ساخته و به کارت ویزیت متصل شد.';
        } else if (biolinks.length === 1) {
          const detail = await api
            .get<Biolink>(`/biolinks/id/${biolinks[0].id}`)
            .catch(() => null);
          if (!detail?.businessCard) {
            await api.patch(`/biolinks/${biolinks[0].id}`, {
              businessCardId: saved.id,
            });
            biolinkNote = ' بیولینک شما به کارت ویزیت متصل شد.';
          }
        }
      } catch {
        biolinkNote =
          ' (اتصال/ساخت بیولینک انجام نشد؛ بعداً از پنل بیولینک تکمیل کنید.)';
      }

      toast.success(`اطلاعات کسب‌وکار ذخیره شد.${biolinkNote}`);
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ذخیره اطلاعات کسب‌وکار ناموفق بود',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--vintage-border)] bg-white p-4 text-xs text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        در حال بارگذاری اطلاعات کسب‌وکار...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {debt > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Wallet className="size-5 text-amber-600" aria-hidden />
          <p className="min-w-0 flex-1 text-xs leading-6 text-amber-800">
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
            {paying ? 'در حال انتقال...' : 'پرداخت آزمایشی و تسویه'}
          </button>
        </div>
      ) : null}

      {card ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <Check className="size-4" aria-hidden />
          <span>
            کارت ویزیت «{card.jobTitle || card.fullName}» ثبت شده است؛ تغییرات این
            فرم همان کارت را به‌روزرسانی می‌کند.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Building2 className="size-4 text-brand" aria-hidden />
          عنوان و اطلاعات اصلی
        </h3>
        <p className="mt-1 text-[11px] leading-6 text-muted">
          فیلدهای ستاره‌دار برای ثبت در کارت ویزیت، صفحه مشاغل و بیولینک اجباری‌اند.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="عنوان کسب‌وکار *"
            required
            value={values.jobTitle}
            onChange={(event) => setField('jobTitle', event.target.value)}
          />
          <Input
            label="نام مدیر یا مسئول *"
            required
            value={values.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">شهر *</span>
            <select
              required
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
          <Input
            label="شماره موبایل *"
            required
            dir="ltr"
            inputMode="tel"
            value={values.mobile}
            onChange={(event) => setField('mobile', event.target.value)}
          />
          <Input
            label="تلفن ثابت"
            dir="ltr"
            inputMode="tel"
            value={values.phone}
            onChange={(event) => setField('phone', event.target.value)}
          />
          <div className="md:col-span-2">
            <Input
              label="آدرس * (حداکثر یک خط)"
              required
              maxLength={120}
              value={values.address}
              onChange={(event) => setField('address', event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-ink">
                درباره کسب‌وکار (حداکثر دو خط)
              </span>
              <textarea
                rows={2}
                maxLength={160}
                className="indeed-input resize-none"
                value={values.bio}
                onChange={(event) => setField('bio', event.target.value)}
              />
            </label>
          </div>
          <Input
            label="ایمیل"
            dir="ltr"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
          />
          <Input
            label="وب‌سایت"
            dir="ltr"
            placeholder="https://example.com"
            value={values.website}
            onChange={(event) => setField('website', event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-4">
        <h3 className="text-sm font-extrabold text-ink">
          شبکه‌های اجتماعی و لینک‌های اختیاری
        </h3>
        <p className="mt-1 text-[11px] leading-6 text-muted">
          این موارد در کارت ویزیت، صفحه مشاغل و بیولینک شما نمایش داده می‌شوند.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <SocialInput
              key={field.key}
              field={field.key}
              value={values[field.key]}
              onChange={(value) => setField(field.key, value)}
            />
          ))}
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
          : card
            ? 'ذخیره تغییرات و ارسال برای تأیید'
            : 'ثبت کسب‌وکار و ارسال برای تأیید'}
      </button>
      {debt > 0 ? (
        <p className="text-[11px] text-amber-700">
          پس از تسویه‌ی بدهی، همین دکمه فعال می‌شود.
        </p>
      ) : null}
    </div>
  );
}
