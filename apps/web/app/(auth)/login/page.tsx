'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Mail, Smartphone } from 'lucide-react';

import { AuthForm } from '@/components/auth/AuthForm';
import { UserEmailAuth } from '@/components/auth/UserEmailAuth';
import { useAuth } from '@/lib/auth';
import { useAuthMethods } from '@/lib/auth-settings';
import { safeInternalPath } from '@/lib/safe-next';
import { cn } from '@/lib/utils';

/**
 * Public sign-in / sign-up for regular users. Both methods (mobile + OTP and
 * email + password) finish with a one-time code. The admin sign-in page is not
 * linked from here on purpose.
 */
function AuthPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get('next'));
  const { token, user, hydrated } = useAuth();
  const { phoneLoginEnabled, emailLoginEnabled, loaded: methodsLoaded } =
    useAuthMethods();

  const [mode, setMode] = useState<'phone' | 'email'>('phone');

  // An already signed-in visitor has no reason to see the login form: send them
  // straight to their panel (a limited admin has no dashboard, so it gets the
  // review panel instead). Runs only after the persisted session rehydrates, so
  // a fresh page load never flashes the form for a logged-in user.
  useEffect(() => {
    if (!hydrated || !token) return;
    const target =
      next === '/dashboard' && user?.role === 'MODERATOR'
        ? '/moderator'
        : next === '/dashboard' && user?.role === 'ADMIN'
          ? '/jga4rm8j'
          : next;
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
          با شماره موبایل یا ایمیل و رمز عبور وارد شوید یا حساب بسازید؛ هر دو روش
          با کد یکبارمصرف تأیید می‌شوند.
        </p>

        {phoneLoginEnabled && emailLoginEnabled ? (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/5 p-1">
            {(
              [
                ['phone', 'موبایل و کد', Smartphone],
                ['email', 'ایمیل و رمز', Mail],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
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
          ) : (
            <UserEmailAuth next={next} />
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
