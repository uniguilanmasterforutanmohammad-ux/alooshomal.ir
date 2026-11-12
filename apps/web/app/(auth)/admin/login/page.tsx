'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, ShieldCheck, Smartphone } from 'lucide-react';

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
  simulated?: boolean;
  devCode?: string;
}

/**
 * Dedicated sign-in for admins and managers (`/admin/login`). Two methods,
 * both finished with a one-time code: email + password, or the phone number on
 * the account. Regular users sign in on `/login` instead.
 */
function AdminLoginContent() {
  const router = useRouter();
  const setSession = useAuth((state) => state.setSession);
  const { token, user, hydrated } = useAuth();

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [code, setCode] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !token) return;
    if (user?.role === 'ADMIN') router.replace('/admin');
    else if (user?.role === 'MODERATOR') router.replace('/moderator');
  }, [hydrated, token, user?.role, router]);

  function switchMode(nextMode: 'email' | 'phone') {
    setMode(nextMode);
    setOtpStep(false);
    setCode('');
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'email') {
        const data = await api.post<OtpStart>('/auth/admin/login', {
          email,
          password,
        });
        setTarget(data.email ?? email);
        setDevCode(data.devCode ?? null);
      } else {
        const data = await api.post<OtpStart>('/auth/admin/phone/request-code', {
          phone,
        });
        setTarget(data.phone ?? phone);
        setDevCode(data.devCode ?? null);
      }
      setCode('');
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود');
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
        mode === 'email'
          ? '/auth/admin/login/verify'
          : '/auth/admin/phone/verify';
      const body = mode === 'email' ? { email, code } : { phone, code };
      const data = await api.post<AuthResponse>(path, body);
      setSession(data.accessToken, data.user);
      router.replace(data.user.role === 'MODERATOR' ? '/moderator' : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-screen items-center justify-center py-12">
      <div className="indeed-panel w-full max-w-md p-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted transition hover:text-brand"
        >
          <ArrowRight className="size-3.5" aria-hidden />
          بازگشت به صفحه اصلی
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-brand" aria-hidden />
          <h1 className="text-2xl font-extrabold text-ink">ورود مدیران</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          این صفحه مخصوص ادمین و مدیران است. ورود با ایمیل و رمز عبور یا با شماره
          موبایل، هر دو با کد یکبارمصرف تأیید می‌شوند.
        </p>

        {!otpStep ? (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/5 p-1">
            {(
              [
                ['email', 'ایمیل و رمز', Mail],
                ['phone', 'موبایل و کد', Smartphone],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold',
                  mode === key ? 'bg-white text-brand shadow-sm' : 'text-muted',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          {otpStep ? (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <p className="rounded-lg bg-black/5 p-3 text-xs leading-6 text-muted">
                {devCode ? (
                  <>
                    حالت توسعه: ارسال واقعی انجام نشد. حساب:{' '}
                    <span dir="ltr" className="font-bold text-ink">
                      {target}
                    </span>
                  </>
                ) : (
                  <>
                    کد یکبارمصرف به{' '}
                    <span dir="ltr" className="font-bold text-ink">
                      {target}
                    </span>{' '}
                    ارسال شد.
                  </>
                )}
              </p>
              {devCode ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  کد آزمایشی شما{' '}
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
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {mode === 'email' ? (
                <>
                  <Input
                    label="ایمیل"
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
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
                </>
              ) : (
                <Input
                  label="شماره موبایل"
                  type="tel"
                  inputMode="tel"
                  required
                  dir="ltr"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="09xxxxxxxxx"
                />
              )}

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
            </form>
          )}
        </div>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-muted transition hover:text-brand"
        >
          ورود کاربران عادی
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-screen items-center justify-center py-12">
          <div className="indeed-panel w-full max-w-md p-8 text-center text-sm text-muted">
            در حال بارگذاری...
          </div>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
