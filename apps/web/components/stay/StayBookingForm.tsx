'use client';

import { useState } from 'react';

import { CardToCardForm } from '@/components/payments/CardToCardForm';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { api } from '@/lib/api';
import { todayIso } from '@/lib/jalali';
import { toast } from '@/lib/toast';

export function StayBookingForm({
  slug,
  publicSlug,
  basePrice,
  minNights,
  instantBooking,
}: {
  slug: string;
  publicSlug?: string | null;
  basePrice?: number;
  minNights?: number;
  instantBooking?: boolean;
}) {
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<{
    id: string;
    depositAmount: number;
    depositStatus: string;
  } | null>(null);
  const [paying, setPaying] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.checkIn || !form.checkOut) {
      toast.error('تاریخ ورود و خروج را انتخاب کنید.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.post<{
        id: string;
        depositAmount: number;
        depositStatus: string;
      }>(
        `/public/accommodations/${encodeURIComponent(slug)}/bookings`,
        {
          ...form,
          guestEmail: form.guestEmail.trim() || undefined,
          message: form.message.trim() || undefined,
        },
      );
      setBooking(created);
      toast.success('درخواست رزرو ثبت شد؛ مالک به‌زودی پاسخ می‌دهد.');
    } finally {
      setSubmitting(false);
    }
  }

  async function payDeposit() {
    if (!booking) return;
    setPaying(true);
    try {
      const result = await api.post<{ url?: string }>(
        `/public/accommodations/${encodeURIComponent(slug)}/bookings/${booking.id}/deposit`,
      );
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      toast.success('ودیعه پرداخت شد');
    } finally {
      setPaying(false);
    }
  }

  const field =
    'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

  const start = form.checkIn ? new Date(form.checkIn) : null;
  const end = form.checkOut ? new Date(form.checkOut) : null;
  const nights =
    start && end && end > start
      ? Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
      : 0;
  const total = nights && basePrice ? nights * basePrice : 0;

  if (booking) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
        <p>
          درخواست رزرو شما ثبت شد. مالک اقامتگاه پس از بررسی با شما تماس می‌گیرد.
        </p>
        {booking.depositAmount > 0 && booking.depositStatus !== 'PAID' ? (
          <button
            type="button"
            onClick={() => void payDeposit()}
            disabled={paying}
            className="indeed-btn indeed-btn-primary self-start text-xs disabled:opacity-60"
          >
            {paying
              ? 'در حال انتقال به درگاه…'
              : `پرداخت ودیعه (${booking.depositAmount.toLocaleString('fa-IR')} تومان)`}
          </button>
        ) : null}
        {publicSlug ? (
          <CardToCardForm
            slug={publicSlug}
            referenceType="BOOKING"
            referenceId={booking.id}
            defaultAmount={booking.depositAmount > 0 ? booking.depositAmount : undefined}
            title="یا پرداخت ودیعه با کارت به کارت"
          />
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={field}
          placeholder="نام و نام خانوادگی"
          value={form.guestName}
          onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))}
          required
        />
        <input
          className={field}
          placeholder="شماره موبایل"
          value={form.guestPhone}
          onChange={(event) => setForm((prev) => ({ ...prev, guestPhone: event.target.value }))}
          required
        />
        <input
          className={field}
          type="email"
          placeholder="ایمیل (اختیاری)"
          value={form.guestEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, guestEmail: event.target.value }))}
        />
        <input
          className={field}
          type="number"
          min={1}
          value={form.guests}
          onChange={(event) => setForm((prev) => ({ ...prev, guests: Number(event.target.value) }))}
        />
        <label className="text-xs text-muted">
          تاریخ ورود
          <div className="mt-1">
            <JalaliDatePicker
              value={form.checkIn}
              onChange={(iso) => setForm((prev) => ({ ...prev, checkIn: iso }))}
              min={todayIso()}
              aria-label="تاریخ ورود"
            />
          </div>
        </label>
        <label className="text-xs text-muted">
          تاریخ خروج
          <div className="mt-1">
            <JalaliDatePicker
              value={form.checkOut}
              onChange={(iso) => setForm((prev) => ({ ...prev, checkOut: iso }))}
              min={form.checkIn || todayIso()}
              aria-label="تاریخ خروج"
            />
          </div>
        </label>
      </div>
      {nights > 0 && total > 0 ? (
        <div className="rounded-lg bg-[var(--vintage-paper)] p-3 text-xs text-muted">
          <div className="flex items-center justify-between">
            <span>
              {nights.toLocaleString('fa-IR')} شب ×{' '}
              {(basePrice ?? 0).toLocaleString('fa-IR')} تومان
            </span>
            <b className="text-ink">{total.toLocaleString('fa-IR')} تومان</b>
          </div>
          {minNights && nights < minNights ? (
            <p className="mt-1 text-red-600">
              حداقل اقامت این اقامتگاه {minNights.toLocaleString('fa-IR')} شب است.
            </p>
          ) : null}
        </div>
      ) : null}
      {instantBooking ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
          رزرو آنی: درخواست شما بدون انتظار برای تأیید مالک ثبت می‌شود.
        </p>
      ) : null}
      <textarea
        className={field}
        rows={3}
        placeholder="پیام برای مالک (اختیاری)"
        value={form.message}
        onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
      />
      <button type="submit" disabled={submitting} className="indeed-btn indeed-btn-primary disabled:opacity-60">
        {submitting ? 'در حال ارسال…' : 'ارسال درخواست رزرو'}
      </button>
    </form>
  );
}
