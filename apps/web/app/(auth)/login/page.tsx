'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Smartphone } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { AuthForm } from '@/components/auth/AuthForm';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/** Only accept same-origin absolute paths, never `//evil.com` open redirects. */
function safeNext(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/dashboard';
}

/**
 * The single entry point for both sign-in and sign-up. Mobile + OTP is the
 * default; email + password is offered as a fallback (also reachable from
 * inside the OTP step). `/register` simply redirects here.
 */
function AuthPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const setSession = useAuth((state) => state.setSession);

  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<AuthResponse>('/auth/login', { email, password });
      setSession(data.accessToken, data.user);
      // A limited admin has no dashboard of their own — land them on the
      // review panel directly (unless an explicit `next` was requested).
      router.replace(
        next === '/dashboard' && data.user.role === 'MODERATOR' ? '/moderator' : next,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-screen items-center justify-center py-12">
      <div className="indeed-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold text-ink">ورود یا ثبت‌نام</h1>
        <p className="mt-1 text-sm text-muted">
          برای ساخت و مدیریت بیولینک و کارت ویزیت، شماره موبایل خود را وارد کنید.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/5 p-1">
          {(
            [
              ['phone', 'موبایل و کد', Smartphone],
              ['email', 'ایمیل و رمز عبور', Mail],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
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

        <div className="mt-6">
          {mode === 'phone' ? (
            <AuthForm next={next} onEmailLogin={() => setMode('email')} />
          ) : (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
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
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="indeed-btn indeed-btn-primary w-full"
              >
                {loading ? 'در حال ورود...' : 'ورود'}
              </button>
              <button
                type="button"
                onClick={() => setMode('phone')}
                className="text-sm font-bold text-brand"
              >
                ورود با موبایل و کد یکبار مصرف
              </button>
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
