'use client';

import { CreditCard } from 'lucide-react';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

/**
 * Last 4 digits of the customer's own card. The bank statement/SMS reveals the
 * payer card, so collecting it at checkout lets the seller's gateway match the
 * deposit to the exact order — even when several orders share the same amount.
 */
export function PayerCardField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
        <CreditCard className="size-3.5" aria-hidden />
        ۴ رقم آخر کارت خودتان
      </label>
      <input
        className={field}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        placeholder="1234"
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, '').slice(0, 4))
        }
        pattern="\d{4}"
        required
      />
      <span className="text-[11px] leading-5 text-muted">
        کارتی که با آن کارت‌به‌کارت می‌کنید؛ برای تطبیق و تأیید خودکار پرداخت
        لازم است.
      </span>
    </div>
  );
}
