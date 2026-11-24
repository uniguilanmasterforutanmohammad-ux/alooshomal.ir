'use client';

import { useState } from 'react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export function PropertyInquiryForm({ token }: { token: string }) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/public/properties/${token}/inquiry`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.message.trim() || undefined,
      });
      setSent(true);
      toast.success('درخواست شما ثبت شد؛ مشاور با شما تماس می‌گیرد');
    } catch {
      toast.error('ثبت درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="indeed-panel p-4 text-sm text-emerald-700">
        درخواست شما ثبت شد. مشاور املاک برای هماهنگی با شما تماس می‌گیرد.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="indeed-panel grid gap-2 p-4">
      <h2 className="text-sm font-extrabold text-ink">درخواست بازدید / تماس</h2>
      <input className={field} placeholder="نام شما" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
      <input className={field} placeholder="شماره تماس" inputMode="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
      <textarea className={field} rows={3} placeholder="پیام (اختیاری)" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
      <button type="submit" className="indeed-btn indeed-btn-primary" disabled={busy}>
        {busy ? 'در حال ارسال…' : 'ارسال درخواست'}
      </button>
    </form>
  );
}
