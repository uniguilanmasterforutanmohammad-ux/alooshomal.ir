'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard, ExternalLink, X } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type CardToCardAccount, type CardToCardPayment } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const statusLabel: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

export default function CardToCardPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [account, setAccount] = useState<CardToCardAccount | null>(null);
  const [payments, setPayments] = useState<CardToCardPayment[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cardNumber: '',
    holderName: '',
    bankName: '',
    iban: '',
    instructions: '',
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, list] = await Promise.all([
        api.get<CardToCardAccount | null>('/card-to-card/settings'),
        api.get<CardToCardPayment[]>(
          `/card-to-card/payments${filter ? `?status=${filter}` : ''}`,
        ),
      ]);
      setAccount(settings);
      setPayments(list);
      if (settings) {
        setForm({
          cardNumber: settings.cardNumber,
          holderName: settings.holderName,
          bankName: settings.bankName ?? '',
          iban: settings.iban ?? '',
          instructions: settings.instructions ?? '',
          isActive: settings.isActive,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/card-to-card');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/card-to-card/settings', {
        cardNumber: form.cardNumber.trim(),
        holderName: form.holderName.trim(),
        bankName: form.bankName.trim() || undefined,
        iban: form.iban.trim() || undefined,
        instructions: form.instructions.trim() || undefined,
        isActive: form.isActive,
      });
      toast.success('اطلاعات کارت ذخیره شد');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function review(payment: CardToCardPayment, status: 'APPROVED' | 'REJECTED') {
    const reviewNote =
      status === 'REJECTED'
        ? window.prompt('دلیل رد رسید (اختیاری):') ?? undefined
        : undefined;
    await api.patch(`/card-to-card/payments/${payment.id}`, { status, reviewNote });
    await load();
    toast.success(status === 'APPROVED' ? 'رسید تأیید شد' : 'رسید رد شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">پرداخت کارت به کارت</h1>
        <p className="mt-1 text-sm text-muted">
          شماره کارت خود را ثبت کنید تا مشتریان بتوانند مبلغ را واریز و رسید را
          برای تأیید شما ارسال کنند.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={save} className="indeed-panel grid gap-3 p-5 md:grid-cols-2">
        <div className="md:col-span-2 flex items-center gap-2 text-sm font-extrabold text-ink">
          <CreditCard className="size-4" aria-hidden />
          اطلاعات کارت کسب‌وکار
        </div>
        <input className={field} placeholder="شماره کارت (۱۶ رقم)" value={form.cardNumber} onChange={(event) => setForm((prev) => ({ ...prev, cardNumber: event.target.value }))} required />
        <input className={field} placeholder="نام صاحب کارت" value={form.holderName} onChange={(event) => setForm((prev) => ({ ...prev, holderName: event.target.value }))} required />
        <input className={field} placeholder="نام بانک" value={form.bankName} onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))} />
        <input className={field} placeholder="شماره شبا (اختیاری)" value={form.iban} onChange={(event) => setForm((prev) => ({ ...prev, iban: event.target.value }))} />
        <textarea className={`${field} md:col-span-2`} rows={2} placeholder="توضیح برای مشتری (مثلاً «پس از واریز، رسید را آپلود کنید»)" value={form.instructions} onChange={(event) => setForm((prev) => ({ ...prev, instructions: event.target.value }))} />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
          نمایش این کارت در صفحه‌ی عمومی فعال باشد
        </label>
        <button type="submit" disabled={saving} className="indeed-btn indeed-btn-primary justify-self-end disabled:opacity-50">
          {saving ? 'در حال ذخیره…' : 'ذخیره اطلاعات کارت'}
        </button>
      </form>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-ink">رسیدهای دریافتی</h2>
          <div className="flex gap-1.5">
            {[
              { value: '', label: 'همه' },
              { value: 'PENDING', label: 'در انتظار' },
              { value: 'APPROVED', label: 'تأییدشده' },
              { value: 'REJECTED', label: 'ردشده' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn('indeed-btn py-1 text-xs', filter === option.value && 'indeed-btn-primary')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">در حال بارگذاری…</p>
        ) : payments.length === 0 ? (
          <div className="indeed-panel p-8 text-center text-sm text-muted">
            {account
              ? 'رسیدی با این وضعیت وجود ندارد.'
              : 'ابتدا شماره کارت را ذخیره کنید تا مشتریان بتوانند رسید ارسال کنند.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => (
              <article key={payment.id} className="indeed-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">
                      {payment.customerName} — {payment.amount.toLocaleString('fa-IR')} تومان
                    </h3>
                    <p className="text-xs text-muted">
                      {payment.customerPhone}
                      {payment.trackingNumber ? ` • پیگیری ${payment.trackingNumber}` : ''}
                      {payment.referenceType === 'ORDER' ? ' • سفارش' : payment.referenceType === 'BOOKING' ? ' • رزرو' : ''}
                    </p>
                    {payment.note ? <p className="mt-1 text-xs text-muted">{payment.note}</p> : null}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-bold',
                      payment.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : payment.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                    )}
                  >
                    {statusLabel[payment.status] ?? payment.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="indeed-btn py-1 text-xs">
                    <ExternalLink className="size-3" aria-hidden /> مشاهده رسید
                  </a>
                  {payment.status === 'PENDING' ? (
                    <>
                      <button type="button" onClick={() => void review(payment, 'APPROVED')} className="indeed-btn indeed-btn-primary py-1 text-xs">
                        <Check className="size-3" aria-hidden /> تأیید
                      </button>
                      <button type="button" onClick={() => void review(payment, 'REJECTED')} className="indeed-btn py-1 text-xs text-red-600">
                        <X className="size-3" aria-hidden /> رد
                      </button>
                    </>
                  ) : payment.reviewNote ? (
                    <span className="text-xs text-muted">یادداشت: {payment.reviewNote}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
