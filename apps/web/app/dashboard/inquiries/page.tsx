'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle2,
  Combine,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useProfileStatus } from '@/lib/profile-status';
import { isoToJalali } from '@/lib/jalali';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { cn } from '@/lib/utils';

interface OfferField {
  name: string;
  label: string;
  required: boolean;
  type: string;
  placeholder?: string;
}

interface OfferService {
  key: string;
  label: string;
  group: string;
  description: string;
  price: number;
  fields: OfferField[];
}

interface OfferComposite {
  key: string;
  label: string;
  description: string | null;
  amount: number;
  serviceLabels: string[];
  fields: OfferField[];
}

interface OfferResponse {
  services: OfferService[];
  composites: OfferComposite[];
}

interface CheckoutResponse {
  paymentId: string;
  amount: number;
  url: string;
  paymentCode: string;
}

type Selection =
  | { kind: 'composite'; item: OfferComposite }
  | { kind: 'service'; item: OfferService };

function faPrice(value: number): string {
  return value > 0 ? `${value.toLocaleString('fa-IR')} تومان` : 'رایگان';
}

/**
 * User-facing «استعلام و خدمات» page: lists the priced Zohal modules and the
 * admin-built composite products, collects the inputs each module needs and
 * starts one gateway payment. The callback runs every module after payment.
 */
function InquiriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated } = useAuth();
  const { status: profileStatus } = useProfileStatus(hydrated && Boolean(token));
  const [offer, setOffer] = useState<OfferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [tickBusy, setTickBusy] = useState<'white' | 'blue' | null>(null);
  const [tickNationalCode, setTickNationalCode] = useState('');
  const [tickBirthIso, setTickBirthIso] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const paymentState = searchParams.get('payment');
  const identityState = searchParams.get('identity');
  const wantedTick = searchParams.get('tick');

  const identity = profileStatus?.identity ?? null;
  const whiteDone = Boolean(identity?.verified);
  const blueDone = Boolean(identity?.businessLicenseVerified);

  useEffect(() => {
    if (!identity) return;
    setTickNationalCode((current) => current || identity.nationalCode || '');
  }, [identity]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<OfferResponse>('/zohal/offer');
      setOffer(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری خدمات ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login?next=/dashboard/inquiries');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  function openForm(next: Selection) {
    setSelection(next);
    setPayload({});
  }

  async function startCheckout() {
    if (!selection) return;
    setBusy(true);
    try {
      const path =
        selection.kind === 'composite'
          ? `/zohal/composites/${selection.item.key}/checkout`
          : `/zohal/services/${selection.item.key}/checkout`;
      const result = await api.post<CheckoutResponse>(path, {
        payload,
        returnTo: '/dashboard/inquiries',
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError('ساخت پرداخت در درگاه ناموفق بود.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  /** Pay for the white tick (identity) or the blue tick (business license). */
  async function startTickCheckout(withLicense: boolean) {
    // The blue tick only needs the identity fields when the white tick is not
    // done yet (the server then charges both legs in one payment).
    const needsIdentity = !whiteDone;
    const nationalCode = tickNationalCode.trim();
    let birthDate = '';
    if (needsIdentity) {
      if (!/^\d{10}$/.test(nationalCode)) {
        setError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
        return;
      }
      const jalali = isoToJalali(tickBirthIso);
      birthDate = jalali
        ? `${jalali.year}/${String(jalali.month).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`
        : '';
      if (!birthDate) {
        setError('برای استعلام هویت، تاریخ تولد را انتخاب کنید.');
        return;
      }
    }
    if (withLicense && !licenseCode.trim()) {
      setError('برای استعلام جواز کسب، کد پیگیری جواز را وارد کنید.');
      return;
    }
    setTickBusy(withLicense ? 'blue' : 'white');
    setError(null);
    try {
      const result = await api.post<{ url?: string; alreadyVerified?: boolean }>(
        '/profile/identity/checkout',
        {
          ...(nationalCode ? { nationalCode } : {}),
          ...(birthDate ? { birthDate } : {}),
          withLicense,
          ...(withLicense ? { licenseTrackingCode: licenseCode.trim() } : {}),
          returnTo: '/dashboard/inquiries',
        },
      );
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      if (result?.alreadyVerified) {
        router.refresh();
        return;
      }
      setError('ساخت پرداخت در درگاه ناموفق بود.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود');
    } finally {
      setTickBusy(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <ShieldCheck className="size-5 text-brand" aria-hidden />
          استعلام و خدمات
        </h1>
        <p className="mt-1 text-sm leading-7 text-muted">
          ماژول‌های هزینه‌دار و محصولات ترکیبی؛ با یک پرداخت، همه‌ی استعلام‌های
          محصول اجرا می‌شود.
        </p>
      </div>

      {paymentState === 'success' ? (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" aria-hidden />
          پرداخت موفق بود و استعلام‌ها اجرا شد. نتیجه در «پرداخت‌های من» است.
        </p>
      ) : paymentState === 'failed' ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4" aria-hidden />
          پرداخت ناموفق بود یا استعلام اجرا نشد. جزئیات در «پرداخت‌های من» است.
        </p>
      ) : identityState === 'success' ? (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" aria-hidden />
          پرداخت موفق بود و استعلام هویت/جواز اجرا شد؛ وضعیت تیک‌ها به‌روز شد.
        </p>
      ) : identityState === 'failed' ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4" aria-hidden />
          پرداخت ناموفق بود یا استعلام اجرا نشد. دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading && !offer ? (
        <p className="text-sm text-muted">در حال بارگذاری...</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <ShieldCheck className="size-4 text-brand" aria-hidden />
          استعلام‌های موردنیاز حساب
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* تیک سفید — احراز هویت و تطبیق شماره تماس */}
          <div
            className={cn(
              'indeed-panel flex flex-col p-4',
              wantedTick === 'white' && !whiteDone && 'ring-2 ring-brand',
            )}
          >
            <div className="flex items-center gap-2">
              <BadgeCheck
                className={cn(
                  'size-5',
                  whiteDone ? 'text-emerald-600' : 'text-muted',
                )}
                aria-hidden
              />
              <p className="font-extrabold text-ink">تیک سفید</p>
            </div>
            <p className="mt-1 text-xs leading-6 text-muted">
              احراز هویت و تطبیق شماره تماس با کد ملی
            </p>
            {whiteDone ? (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden />
                انجام شده — تیک سفید فعال است
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-[11px] font-bold text-muted">
                  کد ملی
                  <input
                    className="indeed-input mt-1 py-1.5 text-sm"
                    inputMode="numeric"
                    maxLength={10}
                    dir="ltr"
                    value={tickNationalCode}
                    onChange={(event) =>
                      setTickNationalCode(event.target.value.replace(/\D/g, ''))
                    }
                    placeholder="۱۰ رقم"
                  />
                </label>
                <label className="text-[11px] font-bold text-muted">
                  تاریخ تولد
                  <JalaliDatePicker
                    className="mt-1"
                    value={tickBirthIso}
                    onChange={setTickBirthIso}
                  />
                </label>
                <button
                  type="button"
                  disabled={tickBusy !== null}
                  onClick={() => void startTickCheckout(false)}
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  {tickBusy === 'white' ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ShieldCheck className="size-4" aria-hidden />
                  )}
                  پرداخت و دریافت تیک سفید
                </button>
              </div>
            )}
          </div>

          {/* تیک آبی — استعلام جواز کسب */}
          <div
            className={cn(
              'indeed-panel flex flex-col p-4',
              wantedTick === 'blue' && !blueDone && 'ring-2 ring-brand',
            )}
          >
            <div className="flex items-center gap-2">
              <BadgeCheck
                className={cn(
                  'size-5',
                  blueDone ? 'text-sky-600' : 'text-muted',
                )}
                aria-hidden
              />
              <p className="font-extrabold text-ink">تیک آبی</p>
            </div>
            <p className="mt-1 text-xs leading-6 text-muted">
              استعلام جواز کسب و تطبیق با کد ملی
            </p>
            {blueDone ? (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-sky-50 p-2 text-xs font-bold text-sky-700">
                <CheckCircle2 className="size-4" aria-hidden />
                انجام شده — تیک آبی فعال است
              </p>
            ) : !whiteDone ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs leading-6 text-amber-700">
                برای دریافت تیک آبی ابتدا باید تیک سفید (احراز هویت) فعال شود.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-[11px] font-bold text-muted">
                  کد پیگیری جواز کسب
                  <input
                    className="indeed-input mt-1 py-1.5 text-sm"
                    dir="ltr"
                    value={licenseCode}
                    onChange={(event) => setLicenseCode(event.target.value)}
                    placeholder="BL123456"
                  />
                </label>
                <button
                  type="button"
                  disabled={tickBusy !== null}
                  onClick={() => void startTickCheckout(true)}
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  {tickBusy === 'blue' ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ShieldCheck className="size-4" aria-hidden />
                  )}
                  پرداخت و دریافت تیک آبی
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {offer && offer.composites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Combine className="size-4 text-brand" aria-hidden />
            محصولات ترکیبی
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {offer.composites.map((composite) => (
              <div key={composite.key} className="indeed-panel flex flex-col p-4">
                <p className="font-extrabold text-ink">{composite.label}</p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {composite.serviceLabels.join(' + ')}
                </p>
                {composite.description ? (
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {composite.description}
                  </p>
                ) : null}
                <p className="mt-3 text-lg font-extrabold text-brand">
                  {faPrice(composite.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => openForm({ kind: 'composite', item: composite })}
                  className="indeed-btn indeed-btn-primary mt-3 py-2 text-sm"
                >
                  خرید و استعلام
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {offer && offer.services.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <BadgeCheck className="size-4 text-brand" aria-hidden />
            ماژول‌های تکی
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {offer.services.map((service) => (
              <div key={service.key} className="indeed-panel flex flex-col p-4">
                <p className="font-extrabold text-ink">{service.label}</p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {service.description}
                </p>
                <p className="mt-3 text-lg font-extrabold text-brand">
                  {faPrice(service.price)}
                </p>
                <button
                  type="button"
                  onClick={() => openForm({ kind: 'service', item: service })}
                  className="indeed-btn indeed-btn-secondary mt-3 py-2 text-sm"
                >
                  خرید و استعلام
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {offer &&
      offer.services.length === 0 &&
      offer.composites.length === 0 &&
      !loading ? (
        <p className="text-sm text-muted">
          در حال حاضر خدمت هزینه‌داری برای خرید آنلاین فعال نیست.
        </p>
      ) : null}

      {selection ? (
        <div className="indeed-panel p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-extrabold text-ink">{selection.item.label}</p>
              <p className="mt-1 text-xs text-muted">
                {selection.kind === 'composite'
                  ? selection.item.serviceLabels.join(' + ')
                  : selection.item.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="text-xs text-muted"
            >
              بستن
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {selection.item.fields.map((field) => (
              <label
                key={field.name}
                className="text-[11px] font-bold text-muted"
              >
                {field.label}
                {field.required ? ' *' : ''}
                <input
                  className="indeed-input mt-1 py-1.5 text-sm"
                  dir={field.type === 'date' ? 'ltr' : undefined}
                  placeholder={field.placeholder}
                  value={payload[field.name] ?? ''}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-6 text-muted">
            مبلغ قابل پرداخت:{' '}
            <span className="font-bold text-brand">
              {faPrice(
                selection.kind === 'composite'
                  ? selection.item.amount
                  : selection.item.price,
              )}
            </span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className={cn('indeed-btn indeed-btn-primary mt-3 py-2 text-sm')}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="size-4" aria-hidden />
            )}
            پرداخت و اجرای استعلام
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-muted">در حال بارگذاری...</div>}
    >
      <InquiriesContent />
    </Suspense>
  );
}
