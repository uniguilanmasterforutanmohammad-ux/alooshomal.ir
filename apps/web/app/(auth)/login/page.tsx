'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Mail, Smartphone } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { AuthForm } from '@/components/auth/AuthForm';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAuthMethods } from '@/lib/auth-settings';
import { safeInternalPath } from '@/lib/safe-next';
import { cn } from '@/lib/utils';

interface AdminLoginStart {
  requiresOtp: true;
  email: string | null;
  phone: string | null;
  resendAfter: number;
  sent: boolean;
  emailSent?: boolean;
  devCode?: string;
}

/**
 * The single entry point for both sign-in and sign-up. Mobile + OTP is the
 * default; email + password is the admin/manager path and always requires a
 * second one-time code. `/register` simply redirects here.
 */
function AuthPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get('next'));
  const setSession = useAuth((state) => state.setSession);
  const { token, user, hydrated } = useAuth();
  const { phoneLoginEnabled, emailLoginEnabled, loaded: methodsLoaded } =
    useAuthMethods();

  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTarget, setOtpTarget] = useState<{
    email: string | null;
    phone: string | null;
  }>({ email: null, phone: null });
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // An already signed-in visitor has no reason to see the login form: send them
  // straight to their panel (a limited admin has no dashboard, so it gets the
  // review panel instead). Runs only after the persisted session rehydrates, so
  // a fresh page load never flashes the form for a logged-in user.
  useEffect(() => {
    if (!hydrated || !token) return;
    const target =
      next === '/dashboard' && user?.role === 'MODERATOR' ? '/moderator' : next;
    router.replace(target);
  }, [hydrated, token, user?.role, next, router]);

  // Default to whichever method the admin left enabled (phone first), so a
  // visitor never lands on a tab that the API will reject.
  useEffect(() => {
    if (!methodsLoaded) return;
    if (mode === 'phone' && !phoneLoginEnabled && emailLoginEnabled) {
      setMode('email');
    } else if (mode === 'email' && !emailLoginEnabled && phoneLoginEnabled) {
      setMode('phone');
    }
  }, [methodsLoaded, phoneLoginEnabled, emailLoginEnabled, mode]);

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<AdminLoginStart>('/auth/login', {
        email,
        password,
      });
      // Email + password only passes the first step: the API sends a one-time
      // code and withholds the tokens until it is verified.
      setOtpTarget({ email: data.email, phone: data.phone });
      setDevCode(data.devCode ?? null);
      setOtpCode('');
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<AuthResponse>('/auth/login/verify', {
        email,
        code: otpCode,
      });
      setSession(data.accessToken, data.user);
      // A limited admin has no dashboard of their own — land them on the
      // review panel directly (unless an explicit `next` was requested).
      router.replace(
        next === '/dashboard' && data.user.role === 'MODERATOR' ? '/moderator' : next,
      );
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
        <h1 className="text-2xl font-extrabold text-ink">ورود یا ثبت‌نام</h1>
        <p className="mt-1 text-sm text-muted">
          کاربران با شماره موبایل وارد می‌شوند؛ ورود با ایمیل و رمز عبور فقط برای
          مدیران و ادمین‌هاست.
        </p>

        {phoneLoginEnabled && emailLoginEnabled ? (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/5 p-1">
            {(
              [
                ['phone', 'موبایل و کد', Smartphone],
                ['email', 'ورود مدیران', Mail],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setOtpStep(false);
                  setError(null);
                }}
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
          {!phoneLoginEnabled && !emailLoginEnabled ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              در حال حاضر هیچ روش ورودی توسط مدیر فعال نیست. لطفاً بعداً تلاش کنید.
            </p>
          ) : mode === 'phone' ? (
            <AuthForm
              next={next}
              onEmailLogin={
                emailLoginEnabled ? () => setMode('email') : undefined
              }
            />
          ) : otpStep ? (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <p className="rounded-lg bg-black/5 p-3 text-xs leading-6 text-muted">
                کد یکبارمصرف به
                {otpTarget.email ? (
                  <>
                    {' '}ایمیل <span dir="ltr" className="font-bold text-ink">{otpTarget.email}</span>
                  </>
                ) : null}
                {otpTarget.phone ? (
                  <>
                    {otpTarget.email ? ' و ' : ' '}شماره{' '}
                    <span dir="ltr" className="font-bold text-ink">{otpTarget.phone}</span>
                  </>
                ) : null}{' '}
                ارسال شد.
              </p>
              {devCode ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  حالت توسعه: کد شما{' '}
                  <span dir="ltr" className="font-bold">{devCode}</span> است.
                </p>
              ) : null}
              <Input
                label="کد تأیید"
                inputMode="numeric"
                required
                dir="ltr"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
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
                  setOtpCode('');
                  setError(null);
                }}
                className="text-sm font-bold text-muted"
              >
                بازگشت
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
              <p className="rounded-lg bg-black/5 p-3 text-xs leading-6 text-muted">
                این روش ورود فقط برای مدیران و ادمین‌ها فعال است و پس از رمز عبور،
                یک کد یکبارمصرف نیز لازم دارد.
              </p>
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
                {loading ? 'در حال ورود...' : 'ورود'}
              </button>
              {phoneLoginEnabled ? (
                <button
                  type="button"
                  onClick={() => setMode('phone')}
                  className="text-sm font-bold text-brand"
                >
                  ورود با موبایل و کد یکبار مصرف
                </button>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
      <AuthPageContent />
    </Suspense>
  );
}
