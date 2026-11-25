'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle2,
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

/**
 * User-facing «استعلام و خدمات» page: only the white tick (identity) and the
 * blue tick (business license) are sold here. The mandatory identity/shahkar
 * inquiries are already collected during onboarding, so they are not offered
 * for a separate purchase on this page.
 */
function InquiriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated } = useAuth();
  const { status: profileStatus } = useProfileStatus(hydrated && Boolean(token));
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login?next=/dashboard/inquiries');
    }
  }, [hydrated, token, router]);

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
          در این صفحه فقط می‌توانید تیک سفید (احراز هویت) و تیک آبی (جواز کسب)
          را با پرداخت هزینه درخواست کنید. استعلام‌های هویتی و شاهکار در همان
          ابتدای کار انجام می‌شوند و نیازی به خرید جداگانه ندارند.
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
