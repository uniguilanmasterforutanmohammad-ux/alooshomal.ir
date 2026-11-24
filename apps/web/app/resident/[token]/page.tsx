'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const STATUS_LABELS: Record<string, string> = {
  UNPAID: 'پرداخت‌نشده',
  PARTIAL: 'ناقص',
  PAID: 'تسویه‌شده',
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;

interface ResidentPanel {
  building: { id: string; name: string; city: string | null };
  unit: { id: string; unitNumber: string; floor: string | null; residentName: string | null; status: string };
  charges: Array<{ id: string; title: string; period: string | null; amount: number; paidAmount: number; status: string; dueDate: string | null }>;
  payments: Array<{ id: string; amount: number; status: string; trackingNumber: string | null; createdAt: string }>;
}

export default function ResidentPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<ResidentPanel | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ chargeId: '', amount: '', trackingNumber: '' });

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.get<ResidentPanel>(`/public/buildings/resident/${token}`));
    } catch {
      setError('این لینک معتبر نیست یا منقضی شده است.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !form.amount) return;
    await api.post(`/public/buildings/resident/${token}/payments`, {
      amount: Number(form.amount),
      chargeId: form.chargeId || undefined,
      trackingNumber: form.trackingNumber.trim() || undefined,
    });
    setForm({ chargeId: '', amount: '', trackingNumber: '' });
    await load();
    toast.success('رسید ثبت شد؛ پس از تأیید مدیر تسویه می‌شود');
  }

  if (error) {
    return <main className="mx-auto max-w-xl p-8 text-center text-sm text-muted">{error}</main>;
  }

  if (!data) {
    return <main className="mx-auto max-w-xl p-8 text-center text-sm text-muted">در حال بارگذاری…</main>;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:p-8">
      <header>
        <h1 className="text-xl font-extrabold text-ink">{data.building.name}</h1>
        <p className="mt-1 text-sm text-muted">
          واحد {data.unit.unitNumber}{data.unit.floor ? ` • طبقه ${data.unit.floor}` : ''}
          {data.unit.residentName ? ` • ${data.unit.residentName}` : ''}
        </p>
      </header>

      <section className="indeed-panel p-4">
        <h2 className="text-sm font-extrabold text-ink">شارژها</h2>
        {data.charges.length === 0 ? (
          <p className="mt-2 text-xs text-muted">شارژی ثبت نشده است.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-xs">
            {data.charges.map((charge) => (
              <li key={charge.id} className="flex items-center justify-between gap-2">
                <span>{charge.title}{charge.period ? ` (${charge.period})` : ''}</span>
                <span className="text-muted">
                  {money(charge.amount)} • {STATUS_LABELS[charge.status] ?? charge.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submit} className="indeed-panel grid gap-2 p-4">
        <h2 className="text-sm font-extrabold text-ink">ثبت رسید پرداخت</h2>
        <select className={field} value={form.chargeId} onChange={(e) => setForm((p) => ({ ...p, chargeId: e.target.value }))}>
          <option value="">پرداخت عمومی</option>
          {data.charges.filter((c) => c.status !== 'PAID').map((charge) => (
            <option key={charge.id} value={charge.id}>{charge.title} — {money(charge.amount)}</option>
          ))}
        </select>
        <input className={field} placeholder="مبلغ" inputMode="numeric" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
        <input className={field} placeholder="شماره پیگیری" value={form.trackingNumber} onChange={(e) => setForm((p) => ({ ...p, trackingNumber: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary">ثبت رسید</button>
      </form>

      <section className="indeed-panel p-4">
        <h2 className="text-sm font-extrabold text-ink">پرداخت‌های من</h2>
        {data.payments.length === 0 ? (
          <p className="mt-2 text-xs text-muted">پرداختی ثبت نشده است.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {data.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-2">
                <span>{money(payment.amount)}</span>
                <span className="text-muted">{STATUS_LABELS[payment.status] ?? payment.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
