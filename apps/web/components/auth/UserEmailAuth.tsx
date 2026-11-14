'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface OtpStart {
  requiresOtp: true;
  flow?: 'login' | 'register';
  email: string | null;
  phone: string | null;
  resendAfter: number;
  sent: boolean;
  emailSent?: boolean;
  devCode?: string;
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
        flow === 'login' ? '/auth/login/verify' : '/auth/register/verify';
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
          {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
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
