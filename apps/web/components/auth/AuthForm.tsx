'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, ApiError, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface RequestCodeResult {
  phone: string;
  sent: boolean;
  resendAfter: number;
  /** Whether a returning account already exists for this phone (login). */
  registered: boolean;
  /** Present only when SMS is disabled (local dev) so the code is visible. */
  devCode?: string;
}

type Step = 'phone' | 'code' | 'password';

/** Only accept same-origin absolute paths, never `//evil.com` open redirects. */
function safeNext(next?: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/dashboard';
}

/**
 * Unified sign-in / sign-up flow (single form, one page).
 *
 *  1. `phone`   — enter the mobile number, request a one-time code.
 *  2. `code`    — verify it. Returning numbers sign straight in; new numbers
 *                 reveal the sign-up fields (name + email) in the same step.
 *  3. `password`— shown once after a new sign-up: the email is prefilled and
 *                 the user may set a password now or skip with «بعداً».
 *
 * An «ورود با ایمیل و رمز عبور» escape hatch is available from the code step
 * (and via the `onEmailLogin` prop) for existing password accounts.
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
  const target = safeNext(next);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [registered, setRegistered] = useState(false);
  const [needSignup, setNeedSignup] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function finish() {
    router.replace(target);
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<RequestCodeResult>('/auth/phone/request-code', {
        phone,
      });
      setPhone(result.phone);
      setRegistered(result.registered);
      setNeedSignup(!result.registered);
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
      const payload: { phone: string; code: string; fullName?: string; email?: string } = {
        phone,
        code,
      };
      if (needSignup || !registered) {
        if (fullName.trim()) payload.fullName = fullName.trim();
        if (email.trim()) payload.email = email.trim();
      }
      const data = await api.post<AuthResponse>('/auth/phone/verify', payload);
      setSession(data.accessToken, data.refreshToken ?? null, data.user);
      if (data.isNewUser) {
        // New account: offer to set a password before continuing.
        setStep('password');
      } else {
        finish();
      }
    } catch (err) {
      // The API asks for the sign-up fields on the first call for a new phone,
      // or rejects a duplicate email so the user can fix it and retry.
      if (err instanceof ApiError) {
        if (
          err.code === 'FULLNAME_REQUIRED' ||
          err.code === 'EMAIL_REQUIRED' ||
          err.code === 'EMAIL_TAKEN'
        ) {
          setNeedSignup(true);
        }
      }
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }
    if (password !== passwordConfirm) {
      setError('تکرار رمز عبور مطابقت ندارد');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/set-password', { password });
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت رمز عبور ناموفق بود');
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
          کد ارسال‌شده به <span dir="ltr" className="font-bold text-ink">{phone}</span> را
          وارد کنید.
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
        {needSignup ? (
          <>
            <p className="rounded-lg bg-black/5 p-3 text-xs leading-6 text-muted">
              شماره‌ی جدید است؛ برای ساخت حساب نام و ایمیل خود را وارد کنید.
            </p>
            <Input
              label="نام و نام خانوادگی"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="سارا محمدی"
            />
            <Input
              label="ایمیل"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </>
        ) : null}
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

  // step === 'password' — offered once, right after a new sign-up.
  return (
    <form onSubmit={savePassword} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        حساب شما ساخته شد ✅ می‌توانید همین حالا یک رمز عبور بگذارید تا بعداً با ایمیل هم
        وارد شوید.
      </p>
      <Input label="ایمیل" type="email" dir="ltr" value={email} readOnly disabled />
      <Input
        label="رمز عبور"
        type="password"
        dir="ltr"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="••••••••"
        hint="حداقل ۸ کاراکتر"
      />
      <Input
        label="تکرار رمز عبور"
        type="password"
        dir="ltr"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        placeholder="••••••••"
      />
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="indeed-btn indeed-btn-primary w-full"
      >
        {loading ? 'در حال ثبت...' : 'ثبت رمز عبور و ادامه'}
      </button>
      <button
        type="button"
        onClick={finish}
        className="text-sm font-bold text-muted"
      >
        بعداً
      </button>
    </form>
  );
}
