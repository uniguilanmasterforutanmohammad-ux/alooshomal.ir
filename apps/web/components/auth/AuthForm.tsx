'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { postLoginPath } from '@/lib/post-login';
import { safeInternalPath } from '@/lib/safe-next';

interface RequestCodeResult {
  phone: string;
  sent: boolean;
  resendAfter: number;
  /** Present only when SMS is disabled (local dev) so the code is visible. */
  devCode?: string;
}

type Step = 'phone' | 'code';

/**
 * Unified sign-in / sign-up flow (single form, one page).
 *
 *  1. `phone`   — enter the mobile number, request a one-time code.
 *  2. `code`    — the OTP field only. Both new and returning numbers finish
 *                 here; a new account starts with just the phone number and
 *                 completes its identity in the «شروع آسان» section
 *                 (`/dashboard/onboarding`).
 *
 * Email is no longer collected in the phone flow. An «ورود با ایمیل و رمز
 * عبور» escape hatch is still available for accounts that prefer that method.
 */
export function AuthForm({
  next,
  onEmailLogin,
}: {
  next?: string;
  onEmailLogin?: () => void;
}) {
  const router = useRouter();
  const setSession = useAuth((state) => state.setSession);
  const target = safeInternalPath(next);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<RequestCodeResult>(
        '/auth/phone/request-code',
        { phone },
      );
      setPhone(result.phone);
      setDevCode(result.devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<AuthResponse>('/auth/phone/verify', {
        phone,
        code,
      });
      setSession(data.accessToken, data.user);
      router.replace(postLoginPath(target, data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={requestCode} className="flex flex-col gap-4">
        <Input
          label="شماره موبایل"
          type="tel"
          required
          dir="ltr"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="09123456789"
          hint="برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید."
        />
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="indeed-btn indeed-btn-primary w-full"
        >
          {loading ? 'در حال ارسال...' : 'ادامه'}
        </button>
        {onEmailLogin ? (
          <button
            type="button"
            onClick={onEmailLogin}
            className="text-sm font-bold text-brand"
          >
            ورود با ایمیل و رمز عبور
          </button>
        ) : null}
      </form>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          کد ارسال‌شده به <span dir="ltr" className="font-bold text-ink">{phone}</span>
          را وارد کنید.
        </p>
        {devCode ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            حالت توسعه: پیامک ارسال نشد. کد شما{' '}
            <span dir="ltr" className="font-bold">{devCode}</span> است.
          </p>
        ) : null}
        <Input
          label="کد تأیید"
          inputMode="numeric"
          required
          dir="ltr"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="------"
        />
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="indeed-btn indeed-btn-primary w-full"
        >
          {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
        </button>
        {onEmailLogin ? (
          <button
            type="button"
            onClick={onEmailLogin}
            className="text-sm font-bold text-brand"
          >
            ورود با ایمیل و رمز عبور
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setStep('phone');
            setCode('');
            setError(null);
          }}
          className="text-sm font-bold text-muted"
        >
          تغییر شماره موبایل
        </button>
      </form>
    );
  }

  return null;
}
