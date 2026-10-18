'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { LinkSelector } from '@/components/link/LinkSelector';
import { LiveBiolinkPreview } from '@/components/biolink/LiveBiolinkPreview';
import { api, type TaxonomyItem } from '@/lib/api';
import {
  SELECTABLE_BIOLINK_THEMES,
  DEFAULT_THEME_KEY,
} from '@/lib/themes';
import { hasAnyValue, useFormAutosave } from '@/lib/use-form-autosave';

export interface BiolinkFormValues {
  fullName: string;
  jobTitle: string;
  company: string;
  bio: string;
  phone: string;
  mobile: string;
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
  /** one-to-one link to one of the owner's business cards (`''` = none) */
  businessCardId: string;
  avatarUrl: string;
  logoUrl: string;
}

const emptyValues: BiolinkFormValues = {
  fullName: '',
  jobTitle: '',
  company: '',
  bio: '',
  phone: '',
  mobile: '',
  email: '',
  website: '',
  address: '',
  linkedin: '',
  instagram: '',
  telegram: '',
  twitter: '',
  whatsapp: '',
  primaryColor: '#8B3A1A',
  template: DEFAULT_THEME_KEY,
  cityId: '',
  businessId: '',
  businessCardId: '',
  avatarUrl: '',
  logoUrl: '',
};

interface Props {
  initial?: Partial<BiolinkFormValues>;
  submitting?: boolean;
  /** Return `false` (or reject) on failure so the autosave snapshot is kept. */
  onSubmit: (
    values: BiolinkFormValues,
    options?: { draft?: boolean },
  ) => void | boolean | Promise<void | boolean>;
  submitLabel?: string;
  /** theme-first builder: pick a theme, then edit fields on the preview */
  inline?: boolean;
  /** show the secondary "save as draft" action in the builder */
  showDraftButton?: boolean;
  /** id of the biolink being edited (so its own link stays selectable) */
  linkCurrentId?: string;
  /** hide the link picker (used by the admin editor, which must not re-link) */
  hideLink?: boolean;
  /**
   * localStorage key for autosaving the in-progress values (only pass this on
   * the "new" builder, so a half-filled form survives a reload/navigation).
   */
  autosaveKey?: string;
}

export function BiolinkForm({
  initial,
  submitting,
  onSubmit,
  submitLabel,
  inline,
  showDraftButton,
  linkCurrentId,
  hideLink,
  autosaveKey,
}: Props) {
  const [values, setValues] = useState<BiolinkFormValues>({
    ...emptyValues,
    ...initial,
  });
  const [cities, setCities] = useState<TaxonomyItem[]>([]);
  const [businesses, setBusinesses] = useState<TaxonomyItem[]>([]);
  const [showRestore, setShowRestore] = useState(false);

  const autosave = useFormAutosave(autosaveKey ?? '', values, {
    enabled: Boolean(autosaveKey),
    shouldPersist: (v) => hasAnyValue(v as unknown as Record<string, unknown>),
  });
  const restoredSnapshot = autosave.restored;

  useEffect(() => {
    // Offer to restore only when there is a meaningful snapshot to recover.
    if (
      autosaveKey &&
      restoredSnapshot &&
      hasAnyValue(restoredSnapshot as unknown as Record<string, unknown>)
    ) {
      setShowRestore(true);
    }
  }, [autosaveKey, restoredSnapshot]);

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

  function setField<K extends keyof BiolinkFormValues>(key: K, value: BiolinkFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submit(values);
  }

  /**
   * Runs the parent's submit and, only if it resolves successfully, drops the
   * localStorage snapshot (so a failed submit keeps the recovery copy).
   */
  async function submit(
    next: BiolinkFormValues,
    options?: { draft?: boolean },
  ) {
    let ok: void | boolean = true;
    try {
      ok = await onSubmit(next, options);
    } catch {
      return;
    }
    // The parent already surfaces any error; only drop the recovery copy when
    // the submit actually succeeded (`false` = explicit failure).
    if (ok !== false) autosave.clear();
  }

  function applyRestored() {
    if (!restoredSnapshot) return;
    setValues((prev) => ({ ...prev, ...restoredSnapshot }));
    setShowRestore(false);
  }

  const cityName = cities.find((c) => c.id === values.cityId)?.name;
  const businessName = businesses.find((b) => b.id === values.businessId)?.name;

  // The builder marks a handful of fields mandatory; the submit buttons stay
  // disabled until they are filled so a half-empty card can't be submitted.
  const requiredOk = Boolean(
    values.jobTitle.trim() &&
      values.fullName.trim() &&
      values.cityId &&
      values.businessId &&
      values.mobile.trim() &&
      values.phone.trim() &&
      values.address.trim(),
  );

  const restoreBanner = showRestore ? (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <span>اطلاعات نیمه‌کاره‌ی ذخیره‌شده در همین مرورگر پیدا شد.</span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={applyRestored}
          className="indeed-btn indeed-btn-primary py-1.5 text-xs"
        >
          بازیابی
        </button>
        <button
          type="button"
          onClick={() => {
            autosave.clear();
            setShowRestore(false);
          }}
          className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
        >
          نادیده بگیر
        </button>
      </span>
    </div>
  ) : null;

  if (inline) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          {restoreBanner}
          <div className="indeed-panel p-6">
            <h2 className="text-lg font-extrabold text-ink">اطلاعات اصلی</h2>
            <p className="mt-1 text-xs text-muted">
              فیلدهای ستاره‌دار اجباری هستند؛ با پر کردن هر فیلد، پیش‌نمایش سمت چپ
              بلافاصله به‌روز می‌شود.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="نام کسب‌وکار (عنوان شغل) *"
                required
                value={values.jobTitle}
                onChange={(event) => setField('jobTitle', event.target.value)}
              />
              <Input
                label="نام و نام خانوادگی *"
                required
                value={values.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-ink">انتخاب شهر *</span>
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
                <span className="text-sm font-bold text-ink">انتخاب کسب‌وکار *</span>
                <select
                  required
                  className="indeed-input"
                  value={values.businessId}
                  onChange={(event) => setField('businessId', event.target.value)}
                >
                  <option value="">انتخاب کسب‌وکار...</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="تلفن همراه *"
                required
                dir="ltr"
                inputMode="tel"
                value={values.mobile}
                onChange={(event) => setField('mobile', event.target.value)}
              />
              <Input
                label="تلفن ثابت *"
                required
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
            </div>
          </div>

          <div className="indeed-panel p-6">
            <h2 className="text-lg font-extrabold text-ink">اطلاعات اختیاری</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="شرکت"
                value={values.company}
                onChange={(event) => setField('company', event.target.value)}
              />
              <Input
                label="ایمیل"
                dir="ltr"
                value={values.email}
                onChange={(event) => setField('email', event.target.value)}
              />
              <div className="md:col-span-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-ink">
                    درباره من (حداکثر دو خط)
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
            <h2 className="text-lg font-extrabold text-ink">تصویر و تم</h2>
            <p className="mt-1 text-xs text-muted">
              در حال حاضر تنها تم «وینتیج» فعال است.
            </p>
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

          {hideLink ? null : (
            <div className="indeed-panel p-6">
              <h2 className="text-lg font-extrabold text-ink">اتصال کارت ویزیت</h2>
              <p className="mt-1 text-xs text-muted">
                می‌توانید این بیولینک را به یکی از کارت‌های ویزیت خود متصل کنید تا در
                دایرکتوری، هرکدام لینک مشاهده‌ی دیگری را نشان دهد.
              </p>
              <div className="mt-4">
                <LinkSelector
                  kind="biolink"
                  value={values.businessCardId}
                  onChange={(value) => setField('businessCardId', value)}
                  currentId={linkCurrentId}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || !requiredOk}
            onClick={() => void submit(values)}
            className="indeed-btn indeed-btn-primary w-full disabled:opacity-60"
          >
            {submitting ? 'در حال ذخیره...' : (submitLabel ?? 'ذخیره و ارسال برای تأیید')}
          </button>
          {showDraftButton ? (
            <button
              type="button"
              disabled={submitting || !requiredOk}
              onClick={() => void submit(values, { draft: true })}
              className="indeed-btn indeed-btn-secondary w-full disabled:opacity-60"
            >
              ذخیره به‌عنوان پیش‌نویس
            </button>
          ) : null}
          <p className="text-center text-xs text-muted">
            {showDraftButton
              ? 'پیش‌نویس تا زمانی که آن را برای تأیید ارسال نکنید برای دیگران قابل‌مشاهده نیست.'
              : 'پس از ذخیره، بیولینک در وضعیت «در انتظار تأیید مدیر» قرار می‌گیرد.'}
          </p>
        </div>

        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-20">
            <div className="indeed-panel p-4">
              <p className="mb-3 text-center text-xs font-bold text-muted">
                پیش‌نمایش زنده بیولینک
              </p>
              <LiveBiolinkPreview
                values={values}
                cityName={cityName}
                businessName={businessName}
              />
            </div>
          </div>
        </aside>
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
              پیش‌نمایش زنده بیولینک
            </p>
            <LiveBiolinkPreview
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
          {hideLink ? null : (
            <div className="mt-4">
              <LinkSelector
                kind="biolink"
                value={values.businessCardId}
                onChange={(value) => setField('businessCardId', value)}
                currentId={linkCurrentId}
              />
            </div>
          )}
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
          <h2 className="text-lg font-extrabold text-ink">ظاهر بیولینک</h2>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">تم آماده</span>
            <select
              className="indeed-input"
              value={values.template}
              onChange={(event) => setField('template', event.target.value)}
            >
              {SELECTABLE_BIOLINK_THEMES.map((theme) => (
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
            {SELECTABLE_BIOLINK_THEMES.map((theme) => (
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
          پس از ذخیره، بیولینک در وضعیت «در انتظار تأیید مدیر» قرار می‌گیرد.
        </p>
      </div>
    </form>
  );
}
