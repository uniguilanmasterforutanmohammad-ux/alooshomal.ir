'use client';

import { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';

import { api } from '@/lib/api';
import { useFeatures } from '@/lib/features';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const REASONS: Array<{ value: string; label: string }> = [
  { value: 'INAPPROPRIATE', label: 'محتوای نامناسب' },
  { value: 'OWNERSHIP', label: 'این کسب‌وکار برای من است' },
  { value: 'WRONG_INFO', label: 'اطلاعات نادرست است' },
  { value: 'SPAM', label: 'تبلیغ یا اسپم' },
  { value: 'OTHER', label: 'سایر' },
];

interface Props {
  slug: string;
  /** name shown in the dialog so the visitor knows what they report */
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * «گزارش» — any visitor (signed in or guest) can flag a public card. The
 * reasons cover inappropriate content and the «این کسب‌وکار برای من است» case;
 * the report is forwarded to the admin team, nothing changes on the card.
 *
 * The `featureBusinessReports` switches hide the button («نمایش») and close
 * the endpoint («فعال») at once.
 */
export function ReportBusinessCardButton({ slug, title, size = 'sm', className }: Props) {
  const { isFeatureVisible } = useFeatures();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('INAPPROPRIATE');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  if (!isFeatureVisible('featureBusinessReports')) return null;

  async function submit() {
    if (sending) return;
    setSending(true);
    try {
      await api.post(`/business-cards/public/${encodeURIComponent(slug)}/report`, {
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success('گزارش شما ثبت شد؛ کارشناسان ما آن را بررسی می‌کنند.', 'گزارش');
      setOpen(false);
      setNote('');
      setReason('INAPPROPRIATE');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ثبت گزارش ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="گزارش این کارت"
        title="گزارش"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-full border font-bold transition',
          size === 'sm' ? 'size-8' : 'size-10',
          'border-[var(--vintage-border)] text-muted hover:border-brand hover:text-brand',
          className,
        )}
      >
        <Flag className={cn(size === 'sm' ? 'size-3.5' : 'size-4')} aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="indeed-panel w-full max-w-md p-5 text-start"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-ink">گزارش کارت</h2>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {title ? `«${title}» — ` : ''}
                  دلیل گزارش را انتخاب کنید. گزارش شما برای مدیران ارسال می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="shrink-0 rounded p-1 text-muted hover:bg-soft hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {REASONS.map((item) => (
                <label
                  key={item.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    reason === item.value
                      ? 'border-brand bg-brand/5 font-bold text-brand'
                      : 'border-[var(--vintage-border)] text-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    className="accent-[var(--brand)]"
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-ink">توضیح (اختیاری)</span>
              <textarea
                rows={3}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="indeed-input resize-none"
                placeholder="اگر توضیح بیشتری دارید بنویسید…"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={sending}
                className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Flag className="size-4" aria-hidden />
                )}
                ثبت گزارش
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
