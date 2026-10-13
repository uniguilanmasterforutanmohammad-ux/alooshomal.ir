'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { api, ApiError, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface RequestCodeResult {
  phone: string;
  sent: boolean;
  resendAfter: number;
  /** Present only when SMS is disabled (local dev) so the code is visible. */
  devCode?: string;
}

/**
 * Phone + OTP sign-in/sign-up. One form serves both: the first step sends a
 * code, the second verifies it and — when the number is new — asks for a full
 * name before creating the account. The API returns `FULLNAME_REQUIRED` for
 * that case, which flips this component into its name step.
 */
export function PhoneAuthForm() {
  const router = useRouter();
  const setSession = useAuth((state) => state.setSession);

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [needName, setNeedName] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<RequestCodeResult>('/auth/phone/request-code', {
        phone,
      });
      setPhone(result.phone);
      setDevCode(result.devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: { phone: string; code: string; fullName?: string } = {
        phone,
        code,
      };
      if (needName && fullName.trim()) {
        payload.fullName = fullName.trim();
      }
      const data = await api.post<AuthResponse>('/auth/phone/verify', payload);
      setSession(data.accessToken, data.user);
      router.push('/dashboard');
    } catch (err) {
      // The API asks for a name the first time a phone signs up.
      if (err instanceof ApiError && err.code === 'FULLNAME_REQUIRED') {
        setNeedName(true);
      }
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={requestCode} className="flex flex-col gap-4">
        <Input
          label="شماره موبایل"
          type="tel"
          required
          dir="ltr"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="09123456789"
          hint="کد یکبار مصرف به این شماره پیامک می‌شود."
        />
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="indeed-btn indeed-btn-primary w-full"
        >
          {loading ? 'در حال ارسال...' : 'ارسال کد'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        کد ارسال‌شده به <span dir="ltr" className="font-bold text-ink">{phone}</span> را
        وارد کنید.
      </p>
      {devCode ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          حالت توسعه: پیامک ارسال نشد. کد شما <span dir="ltr" className="font-bold">{devCode}</span> است.
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
      {needName ? (
        <Input
          label="نام و نام خانوادگی"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="سارا محمدی"
          hint="برای ساخت حساب جدید لازم است."
        />
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
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
          setStep('phone');
          setCode('');
          setError(null);
        }}
        className="text-sm font-bold text-brand"
      >
        تغییر شماره موبایل
      </button>
    </form>
  );
}
