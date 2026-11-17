'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, CreditCard, Upload } from 'lucide-react';

import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { api, type PublicCardInfo, type UploadResult } from '@/lib/api';
import { todayIso } from '@/lib/jalali';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export function CardToCardForm({
  slug,
  card: initialCard,
  referenceType,
  referenceId,
  defaultAmount,
  title = 'پرداخت کارت به کارت',
}: {
  slug: string;
  card?: PublicCardInfo['card'];
  referenceType?: 'ORDER' | 'BOOKING' | 'OTHER';
  referenceId?: string;
  defaultAmount?: number;
  title?: string;
}) {
  const [card, setCard] = useState<PublicCardInfo['card'] | null>(
    initialCard ?? null,
  );
  const [loaded, setLoaded] = useState(Boolean(initialCard));
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    amount: defaultAmount ? String(defaultAmount) : '',
    trackingNumber: '',
    paidAt: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [receipt, setReceipt] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loaded) return;
    void api
      .get<PublicCardInfo>(`/public/card-to-card/${encodeURIComponent(slug)}`)
      .then((info) => setCard(info.card))
      .catch(() => setCard(null))
      .finally(() => setLoaded(true));
  }, [loaded, slug]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api.upload<UploadResult>('/public/uploads/receipt', body);
      setReceipt(result);
      toast.success('رسید آپلود شد');
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!receipt) {
      toast.error('ابتدا تصویر رسید را آپلود کنید');
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error('مبلغ واریز را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/public/card-to-card/${encodeURIComponent(slug)}/payments`, {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        amount,
        trackingNumber: form.trackingNumber.trim() || undefined,
        paidAt: form.paidAt ? new Date(form.paidAt).toISOString() : undefined,
        note: form.note.trim() || undefined,
        receiptUrl: receipt.url,
        referenceType,
        referenceId,
      });
      setDone(true);
      toast.success('رسید برای تأیید مدیر کسب‌وکار ارسال شد');
    } finally {
      setBusy(false);
    }
  }

  async function copyCard() {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(card.cardNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('کپی شماره کارت ممکن نشد');
    }
  }

  if (!loaded) return null;
  if (!card) {
    return (
      <p className="rounded-lg bg-[var(--vintage-paper)] p-3 text-xs text-muted">
        این کسب‌وکار هنوز شماره کارت برای پرداخت کارت به کارت ثبت نکرده است.
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="flex items-center gap-2 font-bold">
          <Check className="size-4" aria-hidden />
          رسید شما ثبت شد
        </p>
        <p className="text-xs">
          مدیر کسب‌وکار رسید را بررسی می‌کند و پس از تأیید، پرداخت نهایی می‌شود.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-[var(--vintage-border)] p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <CreditCard className="size-4" aria-hidden />
        {title}
      </p>
      <div className="rounded-lg bg-[var(--vintage-paper)] p-3 text-xs">
        <p className="text-muted">مبلغ را به کارت زیر واریز کنید:</p>
        <p className="mt-1 flex items-center gap-2 font-mono text-base text-ink">
          {card.cardNumber}
          <button type="button" onClick={() => void copyCard()} className="text-brand" aria-label="کپی شماره کارت">
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
        </p>
        <p className="text-muted">
          به نام {card.holderName}
          {card.bankName ? ` • ${card.bankName}` : ''}
        </p>
        {card.instructions ? (
          <p className="mt-2 whitespace-pre-line text-muted">{card.instructions}</p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="نام و نام خانوادگی" value={form.customerName} onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))} required />
        <input className={field} placeholder="شماره موبایل" value={form.customerPhone} onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))} required />
        <input className={field} type="number" min={1} placeholder="مبلغ واریز (تومان)" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} required />
        <input className={field} placeholder="شماره پیگیری (اختیاری)" value={form.trackingNumber} onChange={(event) => setForm((prev) => ({ ...prev, trackingNumber: event.target.value }))} />
        <label className="text-[11px] text-muted">
          تاریخ واریز
          <div className="mt-1">
            <JalaliDatePicker
              value={form.paidAt}
              onChange={(iso) => setForm((prev) => ({ ...prev, paidAt: iso }))}
              max={todayIso()}
              aria-label="تاریخ واریز"
            />
          </div>
        </label>
        <label className="indeed-btn cursor-pointer justify-center text-xs">
          <Upload className="size-4" aria-hidden />
          {uploading ? 'در حال آپلود…' : receipt ? 'رسید آپلود شد ✓' : 'آپلود تصویر رسید'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>
      <textarea className={field} rows={2} placeholder="توضیح (اختیاری)" value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
      <button type="submit" disabled={busy || !receipt} className="indeed-btn indeed-btn-primary disabled:opacity-50">
        {busy ? 'در حال ارسال…' : 'ارسال رسید برای تأیید'}
      </button>
    </form>
  );
}
