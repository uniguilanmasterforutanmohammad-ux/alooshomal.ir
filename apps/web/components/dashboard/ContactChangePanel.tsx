'use client';

import { useState } from 'react';
import { KeyRound, Mail, Phone, ShieldCheck } from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface Issued {
  /** Dev-only code shown when SMS is disabled (local). */
  devCode?: string;
  sent: boolean;
}

type Kind = 'phone' | 'email';

const COPY = {
  phone: {
    icon: Phone,
    title: 'تغییر شماره موبایل',
    hint: 'کد تأیید به شماره‌ی جدید ارسال می‌شود؛ پس از واردکردن کد، درخواست برای تأیید مدیر ثبت می‌شود و تا آن زمان شماره‌ی فعلی باقی می‌ماند.',
    label: 'شماره موبایل جدید',
    placeholder: '09123456789',
    inputType: 'tel' as const,
    requestPath: '/profile/phone/request-code',
    verifyPath: '/profile/phone/verify',
    field: 'phone',
  },
  email: {
    icon: Mail,
    title: 'تغییر ایمیل',
    hint: 'برای تأیید، یک کد به شماره موبایل فعلی شما ارسال می‌شود؛ سپس تغییر برای تأیید مدیر ثبت می‌شود.',
    label: 'ایمیل جدید',
    placeholder: 'you@example.com',
    inputType: 'email' as const,
    requestPath: '/profile/email/request-code',
    verifyPath: '/profile/email/verify',
    field: 'email',
  },
} as const;

/**
 * Two-step verification for changing the account phone (OTP to the *new*
 * number) or email (OTP to the *current* phone). Both reuse the same OTP
 * infrastructure as sign-in, but in their own namespaces so a login code can
 * never be replayed here.
 */
export function ContactChangePanel({
  kind,
  disabled,
  pendingValue,
  onChanged,
}: {
  kind: Kind;
  /** True when the account has no verified phone (email change needs one). */
  disabled?: boolean;
  /** A value already verified and waiting for admin approval. */
  pendingValue?: string;
  onChanged?: () => void | Promise<void>;
}) {
  const copy = COPY[kind];
  const Icon = copy.icon;
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<Issued>(copy.requestPath, {
        [copy.field]: value.trim(),
      });
      setDevCode(result.devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(copy.verifyPath, {
        [copy.field]: value.trim(),
        code: code.trim(),
      });
      // The value is not applied yet: it waits for admin approval, so the
      // cached session user must stay untouched (it would show a wrong value).
      toast.success('کد تأیید شد؛ درخواست برای تأیید مدیر ثبت شد.');
      setValue('');
      setCode('');
      setStep('input');
      setDevCode(null);
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Icon className="size-4 text-brand" aria-hidden />
        {copy.title}
      </h2>
      <p className="mt-1 text-xs leading-6 text-muted">{copy.hint}</p>

      {pendingValue ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          درخواست تغییر به{' '}
          <span dir="ltr" className="font-bold">{pendingValue}</span> تأیید کد شد و پس از
          تأیید مدیر اعمال می‌شود.
        </p>
      ) : disabled ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          برای تغییر ایمیل ابتدا باید شماره موبایل ثبت و تأیید شده باشد.
        </p>
      ) : step === 'input' ? (
        <form onSubmit={request} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-bold text-muted">
            {copy.label}
            <input
              type={copy.inputType}
              dir="ltr"
              required
              className="indeed-input mt-1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={copy.placeholder}
            />
          </label>
          <button type="submit" disabled={busy} className="indeed-btn indeed-btn-primary">
            {busy ? 'در حال ارسال...' : 'ارسال کد'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-4 flex flex-col gap-3">
          <p className="text-xs text-muted">
            کد ارسال‌شده به{' '}
            <span dir="ltr" className="font-bold text-ink">
              {value}
            </span>{' '}
            را وارد کنید.
          </p>
          {devCode ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              حالت توسعه: کد شما <span dir="ltr" className="font-bold">{devCode}</span> است.
            </p>
          ) : null}
          <label className="text-xs font-bold text-muted">
            کد تأیید
            <input
              inputMode="numeric"
              dir="ltr"
              required
              className="indeed-input mt-1"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="------"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="indeed-btn indeed-btn-primary">
              <ShieldCheck className="size-4" aria-hidden />
              {busy ? 'در حال بررسی...' : 'تأیید و ثبت'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setCode('');
                setDevCode(null);
                setError(null);
              }}
              className="indeed-btn indeed-btn-secondary"
            >
              <KeyRound className="size-4" aria-hidden />
              تغییر مقدار
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
