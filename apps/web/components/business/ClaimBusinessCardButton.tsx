'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldQuestion, X } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { toast } from '@/lib/toast';

interface Props {
  businessCardId: string;
  slug: string;
  /** true for profiles the importer registered on behalf of their owner */
  isUnclaimed?: boolean;
  className?: string;
}

type ClaimStartResult =
  | {
      channel: 'sms' | 'email';
      destination: string;
      resendAfter: number;
      /** Present only in local development (no real SMS/e-mail). */
      devCode?: string;
    }
  | { channel: 'admin'; requested: true; requestId: string }
  | { claimed: true; id: string; slug: string };

/**
 * «شما صاحب این کسب‌وکار هستید؟» — a system-imported profile can only be taken
 * over after proving control of the contact channel it published: a code goes
 * to its mobile (preferred) or e-mail. Cards without either channel cannot be
 * verified, so the request is queued for an admin instead.
 */
export function ClaimBusinessCardButton({
  businessCardId,
  slug,
  isUnclaimed,
  className,
}: Props) {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [channel, setChannel] = useState<'sms' | 'email' | null>(null);
  const [destination, setDestination] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [queued, setQueued] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!isUnclaimed || !isFeatureVisible('featureBusinessClaim')) return null;
  // Ownership/action can only be resolved in the browser.
  if (!hydrated) return null;

  const editHref = `/dashboard/business-cards/${businessCardId}/edit`;
  const loginHref = `/login?next=${encodeURIComponent(`/business/${slug}`)}`;
  const message =
    'این کسب‌وکار به‌صورت سیستمی از یک مرجع عمومی ثبت شده است. اگر صاحب آن هستید، با تأیید شماره/ایمیل ثبت‌شده برای همین کسب‌وکار مالکیت آن را بگیرید و مشخصات را کامل کنید.';

  function applyChallenge(result: Extract<ClaimStartResult, { channel: 'sms' | 'email' }>) {
    setChannel(result.channel);
    setDestination(result.destination);
    setDevCode(result.devCode ?? null);
    setCooldown(result.resendAfter);
    setCode(result.devCode ?? '');
    setOpen(true);
  }

  async function startClaim() {
    setSaving(true);
    try {
      const result = await api.post<ClaimStartResult>(
        `/business-cards/${businessCardId}/claim`,
      );
      if ('claimed' in result) {
        toast.success('این کسب‌وکار از قبل به حساب شما وصل است.');
        router.push(editHref);
        return;
      }
      if (result.channel === 'admin') {
        setQueued(true);
        toast.success(
          'این کسب‌وکار راه ارتباطی قابل تأیید ندارد؛ درخواست شما برای بررسی مدیر ثبت شد.',
        );
        return;
      }
      applyChallenge(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'درخواست تصاحب ناموفق بود',
      );
    } finally {
      setSaving(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('کد ۶ رقمی ارسال‌شده را کامل وارد کنید.');
      return;
    }
    setVerifying(true);
    try {
      await api.post(`/business-cards/${businessCardId}/claim/verify`, {
        code: code.trim(),
      });
      toast.success('این کسب‌وکار به حساب شما واگذار شد. مشخصات را کامل کنید.');
      router.push(editHref);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'کد تأیید نامعتبر است');
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setSaving(true);
    try {
      const result = await api.post<ClaimStartResult>(
        `/business-cards/${businessCardId}/claim`,
      );
      if ('channel' in result && result.channel !== 'admin') {
        applyChallenge(result);
        toast.success('کد تازه ارسال شد.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ارسال دوباره ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={[
          'mb-4 flex flex-col gap-3 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4 sm:flex-row sm:items-center sm:justify-between',
          className ?? '',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <span className="vintage-avatar flex size-10 shrink-0 items-center justify-center">
            <ShieldQuestion className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">صاحب این کسب‌وکار هستید؟</p>
            <p className="mt-1 text-xs leading-6 text-muted">{message}</p>
            {queued ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                درخواست شما ثبت شد و در انتظار بررسی مدیر است.
              </p>
            ) : null}
          </div>
        </div>
        {queued ? null : token ? (
          <button
            type="button"
            onClick={() => void startClaim()}
            disabled={saving}
            className="indeed-btn indeed-btn-primary shrink-0 py-2 text-sm disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldQuestion className="size-4" aria-hidden />
            )}
            شما صاحب این کسب‌وکار هستید
          </button>
        ) : (
          <Link
            href={loginHref}
            prefetch={false}
            className="indeed-btn indeed-btn-primary shrink-0 py-2 text-sm"
          >
            <ShieldQuestion className="size-4" aria-hidden />
            شما صاحب این کسب‌وکار هستید
          </Link>
        )}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تأیید مالکیت کسب‌وکار"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink">تأیید مالکیت</h3>
                <p className="mt-1 text-xs leading-6 text-muted">
                  کد ۶ رقمی به{' '}
                  {channel === 'sms' ? 'موبایل' : 'ایمیل'} زیر ارسال شد:
                  <span dir="ltr" className="mx-1 font-bold text-ink">
                    {destination}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="rounded-full p-1 text-muted hover:bg-soft"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {devCode ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                حالت توسعه: کد آزمایشی{' '}
                <span dir="ltr" className="font-extrabold">
                  {devCode}
                </span>
              </p>
            ) : null}

            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="------"
              className="mt-4 w-full rounded-xl border border-[var(--vintage-border)] bg-white px-3 py-2 text-center text-lg font-extrabold tracking-[0.4em] text-ink outline-none"
            />

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void verifyCode()}
                disabled={verifying || code.length !== 6}
                className="indeed-btn indeed-btn-primary flex-1 py-2 text-sm disabled:opacity-60"
              >
                {verifying ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                تأیید و تصاحب
              </button>
              <button
                type="button"
                onClick={() => void resend()}
                disabled={saving || cooldown > 0}
                className="indeed-btn indeed-btn-secondary py-2 text-xs disabled:opacity-50"
              >
                {cooldown > 0 ? `ارسال دوباره (${cooldown})` : 'ارسال دوباره'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
