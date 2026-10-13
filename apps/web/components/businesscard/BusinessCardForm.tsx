'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { LiveBusinessCardPreview } from '@/components/businesscard/LiveBusinessCardPreview';
import { api, type TaxonomyItem } from '@/lib/api';
import { BUSINESS_CARD_THEMES, DEFAULT_BUSINESS_CARD_THEME_KEY } from '@/lib/themes';

export interface BusinessCardFormValues {
  fullName: string;
  jobTitle: string;
  company: string;
  bio: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  linkedin: string;
  instagram: string;
  telegram: string;
  twitter: string;
  whatsapp: string;
  primaryColor: string;
  template: string;
  cityId: string;
  businessId: string;
  avatarUrl: string;
  logoUrl: string;
}

const emptyValues: BusinessCardFormValues = {
  fullName: '',
  jobTitle: '',
  company: '',
  bio: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  linkedin: '',
  instagram: '',
  telegram: '',
  twitter: '',
  whatsapp: '',
  primaryColor: '#8B3A1A',
  template: DEFAULT_BUSINESS_CARD_THEME_KEY,
  cityId: '',
  businessId: '',
  avatarUrl: '',
  logoUrl: '',
};

interface Props {
  initial?: Partial<BusinessCardFormValues>;
  submitting?: boolean;
  onSubmit: (values: BusinessCardFormValues, options?: { draft?: boolean }) => void;
  submitLabel?: string;
  /** theme-first builder: pick a theme, then edit fields on the preview */
  inline?: boolean;
  /** show the secondary "save as draft" action in the builder */
  showDraftButton?: boolean;
}

export function BusinessCardForm({
  initial,
  submitting,
  onSubmit,
  submitLabel,
  inline,
  showDraftButton,
}: Props) {
  const [values, setValues] = useState<BusinessCardFormValues>({
    ...emptyValues,
    ...initial,
  });
  const [cities, setCities] = useState<TaxonomyItem[]>([]);
  const [businesses, setBusinesses] = useState<TaxonomyItem[]>([]);
  const [themeConfirmed, setThemeConfirmed] = useState(Boolean(initial?.template));

  useEffect(() => {
    api
      .get<TaxonomyItem[]>('/cities')
      .then(setCities)
      .catch(() => setCities([]));
    api
      .get<TaxonomyItem[]>('/businesses')
      .then(setBusinesses)
      .catch(() => setBusinesses([]));
  }, []);

  function setField<K extends keyof BusinessCardFormValues>(key: K, value: BusinessCardFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  const cityName = cities.find((c) => c.id === values.cityId)?.name;
  const businessName = businesses.find((b) => b.id === values.businessId)?.name;

  if (inline && !themeConfirmed) {
    return (
      <ThemePicker
        themes={BUSINESS_CARD_THEMES}
        selected={values.template}
        onSelect={(key) => {
          setField('template', key);
          setThemeConfirmed(true);
        }}
        hint="تم را انتخاب کنید تا کارت با همان تم باز شود و بتوانید همه‌ی فیلدها را مستقیم روی پیش‌نمایش پر کنید."
      />
    );
  }

  if (inline) {
    return (
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <aside className="order-1">
          <div className="lg:sticky lg:top-20">
            <div className="indeed-panel p-4">
              <p className="mb-3 text-center text-xs font-bold text-muted">
                روی هر فیلد کلیک کنید و مستقیم تایپ کنید
              </p>
              <LiveBusinessCardPreview
                values={values}
                cityName={cityName}
                businessName={businessName}
                editable
                onFieldChange={updateField}
                cityOptions={cities}
                businessOptions={businesses}
              />
            </div>
          </div>
        </aside>

        <div className="order-2 flex flex-col gap-4">
          <div className="indeed-panel p-6">
            <h2 className="text-lg font-extrabold text-ink">ظاهر کارت ویزیت</h2>
            <p className="mt-1 text-xs text-muted">
              با انتخاب هر تم، پیش‌نمایش زندهٔ کنار فرم بلافاصله تغییر می‌کند.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {BUSINESS_CARD_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setField('template', theme.key)}
                  title={theme.name}
                  aria-pressed={values.template === theme.key}
                  className={
                    values.template === theme.key
                      ? 'rounded-lg border-2 border-brand p-1.5'
                      : 'rounded-lg border-2 border-transparent p-1.5 hover:border-[var(--vintage-border)]'
                  }
                >
                  <span
                    className="block h-8 w-full rounded-md border border-[var(--vintage-border)]"
                    style={{
                      background: `linear-gradient(135deg, ${theme.swatch[0]} 0 34%, ${theme.swatch[1]} 34% 67%, ${theme.swatch[2]} 67% 100%)`,
                    }}
                  />
                  <span className="mt-1 block truncate text-[10px] text-muted">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ImageUpload
                label="تصویر پروفایل"
                kind="avatar"
                round
                value={values.avatarUrl}
                onChange={(url) => setField('avatarUrl', url)}
              />
              <ImageUpload
                label="لوگو"
                kind="logo"
                value={values.logoUrl}
                onChange={(url) => setField('logoUrl', url)}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={submitting || !values.fullName.trim()}
            onClick={() => onSubmit(values)}
            className="indeed-btn indeed-btn-primary w-full disabled:opacity-60"
          >
            {submitting ? 'در حال ذخیره...' : (submitLabel ?? 'ذخیره و ارسال برای تأیید')}
          </button>
          {showDraftButton ? (
            <button
              type="button"
              disabled={submitting || !values.fullName.trim()}
              onClick={() => onSubmit(values, { draft: true })}
              className="indeed-btn indeed-btn-secondary w-full disabled:opacity-60"
            >
              ذخیره به‌عنوان پیش‌نویس
            </button>
          ) : null}
          <p className="text-center text-xs text-muted">
            {showDraftButton
              ? 'پیش‌نویس تا زمانی که آن را برای تأیید ارسال نکنید برای دیگران قابل‌مشاهده نیست.'
              : 'پس از ذخیره، کارت ویزیت در وضعیت «در انتظار تأیید مدیر» قرار می‌گیرد.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[420px_1fr]">
      {/* live preview, pinned on the left in RTL */}
      <aside className="order-1 lg:order-1">
        <div className="lg:sticky lg:top-20">
          <div className="indeed-panel p-4">
            <p className="mb-3 text-center text-xs font-bold text-muted">
              پیش‌نمایش زنده کارت ویزیت
            </p>
            <LiveBusinessCardPreview
              values={values}
              cityName={cityName}
              businessName={businessName}
            />
          </div>
        </div>
      </aside>

      <div className="order-2 flex flex-col gap-4 lg:order-2">
        <div className="indeed-panel p-6">
          <h2 className="text-lg font-extrabold text-ink">اطلاعات اصلی</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="نام و نام خانوادگی *"
              required
              value={values.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
            />
            <Input
              label="عنوان شغلی"
              value={values.jobTitle}
              onChange={(event) => setField('jobTitle', event.target.value)}
            />
            <Input
              label="شرکت"
              value={values.company}
              onChange={(event) => setField('company', event.target.value)}
            />
            <Input
              label="آدرس"
              value={values.address}
              onChange={(event) => setField('address', event.target.value)}
            />
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
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-ink">کسب و کار</span>
              <select
                className="indeed-input"
                value={values.businessId}
                onChange={(event) => setField('businessId', event.target.value)}
              >
                <option value="">انتخاب کسب و کار...</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">درباره من</span>
            <textarea
              className="indeed-input min-h-28 resize-y"
              value={values.bio}
              onChange={(event) => setField('bio', event.target.value)}
              maxLength={600}
            />
          </label>
        </div>

        <div className="indeed-panel p-6">
          <h2 className="text-lg font-extrabold text-ink">راه‌های ارتباطی</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="تلفن"
              dir="ltr"
              value={values.phone}
              onChange={(event) => setField('phone', event.target.value)}
            />
            <Input
              label="ایمیل"
              dir="ltr"
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
            />
            <Input
              label="وب‌سایت"
              dir="ltr"
              value={values.website}
              onChange={(event) => setField('website', event.target.value)}
            />
            <Input
              label="واتساپ"
              dir="ltr"
              value={values.whatsapp}
              onChange={(event) => setField('whatsapp', event.target.value)}
            />
            <Input
              label="لینکدین"
              dir="ltr"
              value={values.linkedin}
              onChange={(event) => setField('linkedin', event.target.value)}
            />
            <Input
              label="اینستاگرام"
              dir="ltr"
              value={values.instagram}
              onChange={(event) => setField('instagram', event.target.value)}
            />
            <Input
              label="تلگرام"
              dir="ltr"
              value={values.telegram}
              onChange={(event) => setField('telegram', event.target.value)}
            />
            <Input
              label="ایکس (توییتر)"
              dir="ltr"
              value={values.twitter}
              onChange={(event) => setField('twitter', event.target.value)}
            />
          </div>
        </div>

        <div className="indeed-panel p-6">
          <h2 className="text-lg font-extrabold text-ink">ظاهر کارت ویزیت</h2>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">تم آماده</span>
            <select
              className="indeed-input"
              value={values.template}
              onChange={(event) => setField('template', event.target.value)}
            >
              {BUSINESS_CARD_THEMES.map((theme) => (
                <option key={theme.key} value={theme.key}>
                  {theme.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              با انتخاب هر تم، پیش‌نمایش زندهٔ کنار فرم بلافاصله تغییر می‌کند.
            </span>
          </label>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {BUSINESS_CARD_THEMES.map((theme) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => setField('template', theme.key)}
                title={theme.name}
                aria-pressed={values.template === theme.key}
                className={
                  values.template === theme.key
                    ? 'rounded-lg border-2 border-brand p-1.5'
                    : 'rounded-lg border-2 border-transparent p-1.5 hover:border-[var(--vintage-border)]'
                }
              >
                <span
                  className="block h-8 w-full rounded-md border border-[var(--vintage-border)]"
                  style={{
                    background: `linear-gradient(135deg, ${theme.swatch[0]} 0 34%, ${theme.swatch[1]} 34% 67%, ${theme.swatch[2]} 67% 100%)`,
                  }}
                />
                <span className="mt-1 block truncate text-[10px] text-muted">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-3">
            <span className="text-sm font-bold text-ink">رنگ اصلی (تم وینتیج)</span>
            <input
              type="color"
              value={values.primaryColor}
              onChange={(event) => setField('primaryColor', event.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-[var(--indeed-border)]"
            />
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ImageUpload
              label="تصویر پروفایل"
              kind="avatar"
              round
              value={values.avatarUrl}
              onChange={(url) => setField('avatarUrl', url)}
            />
            <ImageUpload
              label="لوگو"
              kind="logo"
              value={values.logoUrl}
              onChange={(url) => setField('logoUrl', url)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="indeed-btn indeed-btn-primary w-full"
        >
          {submitting ? 'در حال ذخیره...' : (submitLabel ?? 'ذخیره و ارسال برای تأیید')}
        </button>
        <p className="text-center text-xs text-muted">
          پس از ذخیره، کارت ویزیت در وضعیت «در انتظار تأیید مدیر» قرار می‌گیرد.
        </p>
      </div>
    </form>
  );
}
