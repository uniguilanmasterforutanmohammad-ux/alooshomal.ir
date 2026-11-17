'use client';

import { useState } from 'react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export function StayBookingForm({ slug }: { slug: string }) {
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
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/public/accommodations/${encodeURIComponent(slug)}/bookings`, {
        ...form,
        guestEmail: form.guestEmail.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setDone(true);
      toast.success('درخواست رزرو ثبت شد؛ مالک به‌زودی پاسخ می‌دهد.');
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

  if (done) {
    return (
      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
        درخواست رزرو شما ثبت شد. مالک اقامتگاه پس از بررسی با شما تماس می‌گیرد.
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
          <input
            className={`${field} mt-1`}
            type="date"
            value={form.checkIn}
            onChange={(event) => setForm((prev) => ({ ...prev, checkIn: event.target.value }))}
            required
          />
        </label>
        <label className="text-xs text-muted">
          تاریخ خروج
          <input
            className={`${field} mt-1`}
            type="date"
            value={form.checkOut}
            onChange={(event) => setForm((prev) => ({ ...prev, checkOut: event.target.value }))}
            required
          />
        </label>
      </div>
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
