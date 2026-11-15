'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { postLoginPath } from '@/lib/post-login';
import { safeInternalPath } from '@/lib/safe-next';

interface RequestCodeResult {
  phone: string;
  sent: boolean;
  resendAfter: number;
  /** Phone channel used for delivery: Bale first, then SMS. */
  channel?: 'bale' | 'sms' | 'dev';
  /** Seconds until the code expires; drives the on-screen countdown. */
  expiresIn?: number;
  /** Present only when SMS is disabled (local dev) so the code is visible. */
  devCode?: string;
}

type Step = 'phone' | 'code';

/** `300` → `5:00`. */
function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
  const setSession = useAuth((state) => state.setSession);
  const target = safeInternalPath(next);

  const [step, setStep] = useState<Step>('phone');
  const [identifier, setIdentifier] = useState('');
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [channel, setChannel] = useState<'bale' | 'sms' | 'dev' | null>(null);
  // Once the user explicitly asks for SMS, later resends stay on SMS.
  const [preferredChannel, setPreferredChannel] = useState<'auto' | 'sms'>(
    'auto',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  // The real-SMS test button is a development aid only; Next inlines
  // `NODE_ENV` at build time, so it never renders on a production build.
  const isDev = process.env.NODE_ENV !== 'production';

  // Count down the code's validity while the user is on the code step. When it
  // reaches zero the resend button becomes available.
  useEffect(() => {
    if (step !== 'code') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const isEmailIdentifier = identifier.includes('@');

  /**
   * A request can fail because the previous code is still inside its resend
   * cooldown. In that case the old code is still valid, so we open the code
   * box instead of leaving the user stuck on the identifier step.
   */
  function handleCodeRequestError(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : fallback;
    setError(message);
    if (message.includes('کد قبلی هنوز معتبر است')) {
      setMode(isEmailIdentifier ? 'email' : 'phone');
      setSecondsLeft(60);
      setStep('code');
    }
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    const value = identifier.trim();
    const emailMode = value.includes('@');
    setLoading(true);
    setError(null);
    try {
      if (emailMode) {
        const result = await api.post<RequestCodeResult>(
          '/auth/email-otp/request',
          { email: value },
        );
        setMode('email');
        setIdentifier(value);
        setDevCode(result.devCode ?? null);
        setChannel(null);
        setSecondsLeft(result.expiresIn ?? 90);
      } else {
        const result = await api.post<RequestCodeResult>(
          '/auth/phone/request-code',
          { phone: value },
        );
        setMode('phone');
        setIdentifier(result.phone);
        setDevCode(result.devCode ?? null);
        setChannel(result.channel ?? null);
        setPreferredChannel('auto');
        setSecondsLeft(result.expiresIn ?? 90);
      }
      setStep('code');
    } catch (err) {
      handleCodeRequestError(err, 'ارسال کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (secondsLeft > 0) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'email') {
        const result = await api.post<RequestCodeResult>(
          '/auth/email-otp/request',
          { email: identifier },
        );
        setDevCode(result.devCode ?? null);
        setSecondsLeft(result.expiresIn ?? 90);
      } else {
        const result = await api.post<RequestCodeResult>(
          '/auth/phone/request-code',
          {
            phone: identifier,
            ...(preferredChannel === 'sms' ? { channel: 'sms' as const } : {}),
          },
        );
        setIdentifier(result.phone);
        setDevCode(result.devCode ?? null);
        setChannel(result.channel ?? null);
        setSecondsLeft(result.expiresIn ?? 90);
      }
      setCode('');
    } catch (err) {
      handleCodeRequestError(err, 'ارسال کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  /**
   * The code went out through Bale; this asks the API to deliver the same
   * sign-in code by SMS instead (the previous code is replaced).
   */
  async function sendViaSms() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<RequestCodeResult>(
        '/auth/phone/request-code',
        { phone: identifier, channel: 'sms' },
      );
      setIdentifier(result.phone);
      setDevCode(result.devCode ?? null);
      setChannel(result.channel ?? null);
      setPreferredChannel('sms');
      setSecondsLeft(result.expiresIn ?? 90);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data =
        mode === 'email'
          ? await api.post<AuthResponse>('/auth/email-otp/verify', {
              email: identifier,
              code,
            })
          : await api.post<AuthResponse>('/auth/phone/verify', {
              phone: identifier,
              code,
            });
      setSession(data.accessToken, data.user);
      // A full navigation (instead of `router.replace`) avoids a stale chunk
      // error when the login page was opened before a deployment: the browser
      // fetches the dashboard document and its current build assets together.
      window.location.replace(postLoginPath(target, data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function testSms() {
    if (!identifier.trim()) {
      setTestError('اول شماره موبایل را وارد کنید');
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const result = await api.post<{ phone: string; sent: boolean; code: string }>(
        '/auth/dev/sms-test',
        { phone: identifier },
      );
      setTestResult(
        `پیامک ارسال شد؛ کد دریافتی از ملی‌پیامک: ${result.code}`,
      );
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود');
    } finally {
      setTestLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={requestCode} className="flex flex-col gap-4">
        <Input
          label="موبایل و یا ایمیل"
          type="text"
          required
          dir="ltr"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="09123456789 یا you@example.com"
          hint="برای ورود یا ثبت‌نام، شماره موبایل یا ایمیل خود را وارد کنید."
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
        {isDev ? (
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3">
            <p className="text-xs font-bold text-amber-900">
              تست ارسال پیامک (فقط محیط توسعه)
            </p>
            <p className="mt-1 text-xs text-amber-800">
              این دکمه یک کد واقعی از مسیر OTP ملی‌پیامک می‌فرستد تا اتصال را
              بررسی کنید. ورود با این کد ممکن نیست.
            </p>
            <button
              type="button"
              onClick={testSms}
              disabled={testLoading}
              className="mt-2 w-full rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-60"
            >
              {testLoading ? 'در حال ارسال...' : 'ارسال پیامک آزمایشی OTP'}
            </button>
            {testResult ? (
              <p className="mt-2 text-xs font-bold text-emerald-700">
                {testResult}
              </p>
            ) : null}
            {testError ? (
              <p className="mt-2 text-xs font-bold text-red-700">{testError}</p>
            ) : null}
          </div>
        ) : null}
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
          کد ارسال‌شده به{' '}
          <span dir="ltr" className="font-bold text-ink">{identifier}</span>
          {mode === 'email' ? ' (ایمیل)' : ''} را وارد کنید.
        </p>
        {channel === 'bale' ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-emerald-600">
              کد در پیام‌رسان بله برای شما ارسال شد.
            </p>
            <button
              type="button"
              onClick={() => void sendViaSms()}
              disabled={loading}
              className="w-full rounded-md border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              ارسال با پیامک
            </button>
          </div>
        ) : channel === 'sms' ? (
          <p className="text-xs font-bold text-muted">کد پیامکی ارسال شد.</p>
        ) : null}
        <p
          className={
            secondsLeft > 0
              ? 'text-xs font-bold text-muted'
              : 'text-xs font-bold text-red-600'
          }
        >
          {secondsLeft > 0
            ? `اعتبار کد: ${formatSeconds(secondsLeft)}`
            : 'کد منقضی شده است؛ کد جدید بگیرید.'}
        </p>
        {devCode ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            حالت توسعه: کد ارسال نشد. کد شما{' '}
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
          disabled={loading || secondsLeft === 0}
          className="indeed-btn indeed-btn-primary w-full"
        >
          {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
        </button>
        <button
          type="button"
          onClick={resendCode}
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {secondsLeft > 0
            ? `ارسال مجدد کد تا ${formatSeconds(secondsLeft)}`
            : 'ارسال مجدد کد'}
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
          تغییر موبایل یا ایمیل
        </button>
      </form>
    );
  }

  return null;
}
