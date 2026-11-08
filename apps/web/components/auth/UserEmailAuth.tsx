'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface OtpStart {
  requiresOtp: true;
  email: string | null;
  phone: string | null;
  resendAfter: number;
  sent: boolean;
  emailSent?: boolean;
  devCode?: string;
}

/**
 * Email + password sign-in / sign-up for regular users. Both flows are
 * two-step: the password (or the new account) is confirmed with a one-time
 * code sent to the address before a session is created.
 */
export function UserEmailAuth({ next }: { next: string }) {
  const router = useRouter();
  const setSession = useAuth((state) => state.setSession);

  const [kind, setKind] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [code, setCode] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchKind(nextKind: 'login' | 'register') {
    setKind(nextKind);
    setOtpStep(false);
    setCode('');
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const path = kind === 'login' ? '/auth/login' : '/auth/register';
      const body =
        kind === 'login'
          ? { email, password }
          : { email, password, fullName: fullName.trim() || undefined };
      const data = await api.post<OtpStart>(path, body);
      setTarget(data.email ?? email);
      setDevCode(data.devCode ?? null);
      setCode('');
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود');
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
        kind === 'login' ? '/auth/login/verify' : '/auth/register/verify';
      const data = await api.post<AuthResponse>(path, { email, code });
      setSession(data.accessToken, data.user);
      router.replace(next);
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
          disabled={loading}
          className="indeed-btn indeed-btn-primary w-full"
        >
          {loading
            ? 'در حال بررسی...'
            : kind === 'login'
              ? 'تأیید و ورود'
              : 'تأیید و ساخت حساب'}
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
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-black/5 p-1">
        {(
          [
            ['login', 'ورود'],
            ['register', 'ثبت‌نام'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => switchKind(key)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-bold',
              kind === key ? 'bg-white text-brand shadow-sm' : 'text-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === 'register' ? (
        <Input
          label="نام و نام خانوادگی"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="سارا محمدی"
        />
      ) : null}
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
        {loading
          ? 'در حال ارسال کد...'
          : kind === 'login'
            ? 'ورود با ایمیل'
            : 'ثبت‌نام با ایمیل'}
      </button>
      <p className="text-xs leading-6 text-muted">
        پس از این مرحله، یک کد یکبارمصرف به ایمیل شما ارسال می‌شود و ورود/ثبت‌نام
        فقط با تأیید آن کامل می‌شود.
      </p>
    </form>
  );
}
