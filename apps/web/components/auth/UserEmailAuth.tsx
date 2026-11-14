'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { postLoginPath } from '@/lib/post-login';

interface OtpStart {
  requiresOtp: true;
  flow?: 'login' | 'register';
  email: string | null;
  phone: string | null;
  resendAfter: number;
  /** Seconds until the code expires; drives the on-screen countdown. */
  expiresIn?: number;
  sent: boolean;
  emailSent?: boolean;
  devCode?: string;
}

/** `90` → `1:30`. */
function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Unified email + password entry point for regular users: the API signs an
 * existing account in or creates a new one, then both flows finish with the
 * same one-time code sent to the address.
 */
export function UserEmailAuth({ next }: { next: string }) {
  const router = useRouter();
  const setSession = useAuth((state) => state.setSession);

  const [flow, setFlow] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [code, setCode] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Count down the email code's validity; resend unlocks at zero.
  useEffect(() => {
    if (!otpStep) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpStep]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<OtpStart>('/auth/email', { email, password });
      setFlow(data.flow === 'register' ? 'register' : 'login');
      setTarget(data.email ?? email);
      setDevCode(data.devCode ?? null);
      setCode('');
      setSecondsLeft(data.expiresIn ?? 90);
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (secondsLeft > 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<OtpStart>('/auth/email', { email, password });
      // Keep the original flow: a re-issued code for a brand-new account must
      // still finish through `register/verify` (default plan + admin notice).
      setTarget(data.email ?? email);
      setDevCode(data.devCode ?? null);
      setCode('');
      setSecondsLeft(data.expiresIn ?? 90);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const path =
        flow === 'login' ? '/auth/login/verify' : '/auth/register/verify';
      const data = await api.post<AuthResponse>(path, { email, code });
      setSession(data.accessToken, data.user);
      router.replace(postLoginPath(next, data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  if (otpStep) {
    return (
      <form onSubmit={verify} className="flex flex-col gap-4">
        <p className="rounded-lg bg-black/5 p-3 text-xs leading-6 text-muted">
          کد یکبارمصرف به ایمیل{' '}
          <span dir="ltr" className="font-bold text-ink">
            {target}
          </span>{' '}
          ارسال شد.
        </p>
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
            حالت توسعه: کد شما{' '}
            <span dir="ltr" className="font-bold">
              {devCode}
            </span>{' '}
            است.
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
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
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
          onClick={resend}
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {secondsLeft > 0
            ? `ارسال مجدد کد تا ${formatSeconds(secondsLeft)}`
            : 'ارسال مجدد کد'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOtpStep(false);
            setCode('');
            setError(null);
          }}
          className="text-sm font-bold text-muted"
        >
          بازگشت
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="ایمیل"
        type="email"
        required
        dir="ltr"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
      />
      <Input
        label="رمز عبور"
        type="password"
        required
        dir="ltr"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="••••••••"
      />

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="indeed-btn indeed-btn-primary w-full"
      >
        {loading ? 'در حال ارسال کد...' : 'ادامه'}
      </button>
      <p className="text-xs leading-6 text-muted">
        کد یکبارمصرف به ایمیل ارسال می‌گردد.
      </p>
    </form>
  );
}
