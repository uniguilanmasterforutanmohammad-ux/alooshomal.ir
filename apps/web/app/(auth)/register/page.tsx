'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuth((state) => state.setSession);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<AuthResponse>('/auth/register', {
        fullName,
        email,
        password,
      });
      setSession(data.accessToken, data.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت‌نام ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-screen items-center justify-center py-12">
      <form onSubmit={handleSubmit} className="indeed-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold text-ink">ساخت حساب کاربری</h1>
        <p className="mt-1 text-sm text-muted">در چند ثانیه حساب بسازید و بیولینک خود را طراحی کنید.</p>

        <div className="mt-6 flex flex-col gap-4">
          <Input
            label="نام و نام خانوادگی"
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
          <Input
            label="رمز عبور"
            type="password"
            required
            dir="ltr"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="حداقل ۸ کاراکتر"
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        <button type="submit" disabled={loading} className="indeed-btn indeed-btn-primary mt-6 w-full">
          {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link href="/login" className="font-bold text-brand">
            وارد شوید
          </Link>
        </p>
      </form>
    </div>
  );
}
