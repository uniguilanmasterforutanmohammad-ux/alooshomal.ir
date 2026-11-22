'use client';

import { useState } from 'react';
import { Loader2, Mail, ShieldCheck, Smartphone } from 'lucide-react';

import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { postLoginPath } from '@/lib/post-login';
import { safeInternalPath } from '@/lib/safe-next';

export interface DevAdminIdentity {
  email: string | null;
  phone: string | null;
  name: string | null;
}

/**
 * Development-only shortcut shown on the sign-in page: signs a local
 * admin/manager in with a *fake* OTP (no code requested or checked), via the
 * email or phone identity. Rendered by the login page only when
 * `NODE_ENV !== 'production'`; the matching API routes also 404 in production.
 */
export function DevAdminLogin({
  next,
  identity,
}: {
  next?: string;
  identity?: DevAdminIdentity | null;
}) {
  const setSession = useAuth((state) => state.setSession);
  const [busy, setBusy] = useState<'email' | 'phone' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function quickLogin(method: 'email' | 'phone') {
    setBusy(method);
    setError(null);
    try {
      const data = await api.post<AuthResponse>('/auth/dev/quick-login', {
        method,
      });
      setSession(data.accessToken, data.user);
      // A full navigation matches the regular sign-in flow (fresh build assets).
      window.location.replace(
        postLoginPath(safeInternalPath(next), data.user.role),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود سریع ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
        <ShieldCheck className="size-3.5" aria-hidden />
        ورود سریع مدیر (فقط محیط توسعه)
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-800">
        کد یکبارمصرف در حالت لوکال فیک است و وارد نمی‌شود؛ با یک کلیک وارد
        پنل مدیر شوید. این بخش در نسخه‌ی نهایی نمایش داده نمی‌شود.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void quickLogin('email')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-60"
        >
          {busy === 'email' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Mail className="size-3.5" aria-hidden />
          )}
          ورود با ایمیل
        </button>
        <button
          type="button"
          onClick={() => void quickLogin('phone')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-60"
        >
          {busy === 'phone' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Smartphone className="size-3.5" aria-hidden />
          )}
          ورود با موبایل
        </button>
      </div>
      {identity?.email ? (
        <p className="mt-2 text-[11px] text-amber-800">
          ایمیل مدیر: <span dir="ltr" className="font-bold">{identity.email}</span>
          {identity.phone ? (
            <>
              {' '}
              — موبایل: <span dir="ltr" className="font-bold">{identity.phone}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-bold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
