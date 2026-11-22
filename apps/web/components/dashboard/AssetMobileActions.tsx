'use client';

import { useState } from 'react';
import { Phone, Plus, ShieldCheck, X } from 'lucide-react';

import { Input } from '@/components/ui/Input';

export interface VerifiedPhoneEntry {
  phone: string;
  source: 'ACCOUNT' | 'SHAHKAR';
}

interface Props {
  /** The card/biolink's current primary mobile. */
  mobile: string;
  /** Phones already verified for this account (no charge to reuse). */
  verifiedPhones: VerifiedPhoneEntry[];
  /** Extra phones the user added to this asset. */
  extraMobiles: string[];
  /** Shahkar fee for one not-yet-verified number. */
  shahkarPrice: number;
  allowChange: boolean;
  allowAdd: boolean;
  onChangeMobile: (phone: string) => void;
  onAddMobile: (phone: string) => void;
  onRemoveExtra: (phone: string) => void;
}

const PHONE_RE = /^09\d{9}$/;

function normalize(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[^\d+]/g, '')
    .slice(0, 11);
}

/**
 * «تغییر / افزودن تلفن همراه» under the mobile field of the card/biolink
 * builder. Every new number that is not already verified for this account
 * adds one Shahkar inquiry to the cart; the parent charges it on submit.
 */
export function AssetMobileActions({
  mobile,
  verifiedPhones,
  extraMobiles,
  shahkarPrice,
  allowChange,
  allowAdd,
  onChangeMobile,
  onAddMobile,
  onRemoveExtra,
}: Props) {
  const [mode, setMode] = useState<'change' | 'add' | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verifiedSet = new Set(verifiedPhones.map((entry) => entry.phone));

  function open(next: 'change' | 'add') {
    setMode(next);
    setValue('');
    setError(null);
  }

  function confirm() {
    const phone = normalize(value);
    if (!PHONE_RE.test(phone)) {
      setError('شماره موبایل معتبر نیست (مثال: 09123456789).');
      return;
    }
    if (mode === 'change' && phone === mobile) {
      setError('این همان شماره‌ی فعلی است.');
      return;
    }
    if (mode === 'add' && (phone === mobile || extraMobiles.includes(phone))) {
      setError('این شماره قبلاً ثبت شده است.');
      return;
    }
    if (mode === 'change') onChangeMobile(phone);
    if (mode === 'add') onAddMobile(phone);
    setMode(null);
    setValue('');
    setError(null);
  }

  const chargeable = (phone: string) => !verifiedSet.has(phone);

  return (
    <div className="rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-3">
      <p className="flex items-center gap-2 text-xs font-bold text-ink">
        <Phone className="size-4 text-brand" aria-hidden />
        شماره‌های موبایل
      </p>
      <p className="mt-1 text-[11px] leading-6 text-muted">
        شماره‌ی اصلی از اطلاعات تأییدشده‌ی حساب است. هر شماره‌ی تازه با استعلام
        شاهکار بررسی می‌شود و تعرفه‌ی آن به سبد خرید اضافه می‌گردد.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {allowChange ? (
          <button
            type="button"
            onClick={() => open('change')}
            className="indeed-btn indeed-btn-secondary py-2 text-xs"
          >
            <Phone className="size-4" aria-hidden />
            تغییر تلفن همراه
          </button>
        ) : null}
        {allowAdd ? (
          <button
            type="button"
            onClick={() => open('add')}
            className="indeed-btn indeed-btn-secondary py-2 text-xs"
          >
            <Plus className="size-4" aria-hidden />
            افزودن تلفن همراه
          </button>
        ) : null}
      </div>

      {extraMobiles.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {extraMobiles.map((phone) => (
            <li
              key={phone}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-[11px]"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
                <span dir="ltr" className="font-bold text-ink">
                  {phone}
                </span>
                <span className="text-muted">
                  {chargeable(phone)
                    ? `+ استعلام شاهکار (${shahkarPrice.toLocaleString('fa-IR')} تومان)`
                    : 'تأییدشده'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveExtra(phone)}
                className="rounded-md border border-[var(--vintage-border)] p-1 text-red-600 hover:border-red-400"
                aria-label="حذف شماره"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {mode ? (
        <div className="mt-3 rounded-xl border border-brand/30 bg-[var(--vintage-surface)] p-3">
          <p className="text-xs font-extrabold text-ink">
            {mode === 'change' ? 'ثبت شماره‌ی جدید' : 'افزودن شماره‌ی جدید'}
          </p>
          <div className="mt-2">
            <Input
              label="شماره موبایل"
              dir="ltr"
              inputMode="tel"
              maxLength={11}
              value={value}
              placeholder="09123456789"
              onChange={(event) => setValue(normalize(event.target.value))}
            />
          </div>
          {error ? (
            <p className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              className="indeed-btn indeed-btn-primary py-2 text-xs"
            >
              {chargeable(normalize(value)) && PHONE_RE.test(normalize(value))
                ? `افزودن به سبد خرید (${shahkarPrice.toLocaleString('fa-IR')} تومان)`
                : 'ثبت شماره'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setError(null);
              }}
              className="indeed-btn indeed-btn-secondary py-2 text-xs"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
