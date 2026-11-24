'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type EduBalance, type EduInstallment, type EduPayment } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;

const PAY_STATUS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

export default function EduTuitionPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [balances, setBalances] = useState<EduBalance[]>([]);
  const [payments, setPayments] = useState<EduPayment[]>([]);
  const [installments, setInstallments] = useState<EduInstallment[]>([]);
  const [reminders, setReminders] = useState<EduInstallment[]>([]);
  const [form, setForm] = useState({ enrollmentId: '', amount: '', trackingNumber: '' });
  const [instForm, setInstForm] = useState({ enrollmentId: '', title: 'قسط', amount: '', dueDate: '' });

  const load = useCallback(async () => {
    const [b, p, i, r] = await Promise.all([
      api.get<EduBalance[]>('/edu-tuition/balances'),
      api.get<EduPayment[]>('/edu-tuition/payments'),
      api.get<EduInstallment[]>('/edu-tuition/installments'),
      api.get<EduInstallment[]>('/edu-tuition/reminders'),
    ]);
    setBalances(b);
    setPayments(p);
    setInstallments(i);
    setReminders(r);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/edu-tuition');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!form.enrollmentId || !form.amount) return;
    await api.post('/edu-tuition/payments', {
      enrollmentId: form.enrollmentId,
      amount: Number(form.amount),
      trackingNumber: form.trackingNumber.trim() || undefined,
    });
    setForm({ enrollmentId: '', amount: '', trackingNumber: '' });
    await load();
    toast.success('رسید ثبت شد (در انتظار تأیید)');
  }

  async function review(payment: EduPayment, status: 'APPROVED' | 'REJECTED') {
    await api.patch(`/edu-tuition/payments/${payment.id}`, { status });
    await load();
    toast.success(status === 'APPROVED' ? 'پرداخت تأیید شد' : 'پرداخت رد شد');
  }

  async function addInstallment(event: React.FormEvent) {
    event.preventDefault();
    if (!instForm.enrollmentId || !instForm.amount || !instForm.dueDate) return;
    await api.post('/edu-tuition/installments', {
      enrollmentId: instForm.enrollmentId,
      title: instForm.title.trim() || 'قسط',
      amount: Number(instForm.amount),
      dueDate: new Date(instForm.dueDate).toISOString(),
    });
    setInstForm((p) => ({ ...p, amount: '', dueDate: '' }));
    await load();
    toast.success('قسط زمان‌بندی شد');
  }

  async function markInstallmentPaid(row: EduInstallment) {
    await api.patch(`/edu-tuition/installments/${row.id}`, { status: 'PAID' });
    await load();
  }

  async function removeInstallment(id: string) {
    await api.delete(`/edu-tuition/installments/${id}`);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">شهریه و اقساط</h1>
        <p className="mt-1 text-sm text-muted">
          مانده شهریه‌ی هر ثبت‌نام و تطبیق رسید/کارت‌به‌کارت. رسید به‌تنهایی تسویه نیست.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="indeed-btn indeed-btn-ghost text-xs"
          onClick={() => void api.download('/edu-tuition/export/payments', 'edu-payments.csv')}
        >
          خروجی CSV پرداخت‌ها
        </button>
        <span className="text-xs text-muted">{reminders.length} قسط نزدیک/گذشته از سررسید</span>
      </div>

      {reminders.length > 0 ? (
        <section className="indeed-panel p-4">
          <h2 className="mb-2 text-sm font-extrabold text-ink">یادآوری اقساط</h2>
          <ul className="flex flex-col gap-1 text-xs">
            {reminders.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2">
                <span>{row.enrollment?.student?.fullName ?? '—'} • {row.title}</span>
                <span className="text-muted">{money(row.amount)} • سررسید {new Date(row.dueDate).toLocaleDateString('fa-IR')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={recordPayment} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <select className={field} value={form.enrollmentId} onChange={(e) => setForm((p) => ({ ...p, enrollmentId: e.target.value }))} required>
          <option value="">انتخاب ثبت‌نام…</option>
          {balances.map((row) => (
            <option key={row.id} value={row.id}>
              {row.student?.fullName} — {row.class?.title} (بدهی {row.balance.toLocaleString('fa-IR')})
            </option>
          ))}
        </select>
        <input className={field} placeholder="مبلغ" inputMode="numeric" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
        <input className={field} placeholder="شماره پیگیری" value={form.trackingNumber} onChange={(e) => setForm((p) => ({ ...p, trackingNumber: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary">ثبت رسید</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="indeed-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">مانده شهریه</h2>
          {balances.length === 0 ? (
            <p className="mt-2 text-xs text-muted">ثبت‌نامی نیست.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-xs">
              {balances.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <span>{row.student?.fullName} — {row.class?.title}</span>
                  <span className={cn('font-bold', row.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {row.balance > 0 ? money(row.balance) : 'تسویه'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="indeed-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">رسیدهای شهریه</h2>
          {payments.length === 0 ? (
            <p className="mt-2 text-xs text-muted">رسیدی ثبت نشده است.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-xs">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p>{payment.enrollment?.student?.fullName} • {money(payment.amount)}</p>
                    <p className="text-[10px] text-muted">
                      {PAY_STATUS[payment.status] ?? payment.status}
                      {payment.trackingNumber ? ` • ${payment.trackingNumber}` : ''}
                    </p>
                  </div>
                  {payment.status === 'PENDING' ? (
                    <div className="flex gap-1">
                      <button type="button" className="indeed-btn indeed-btn-ghost" onClick={() => void review(payment, 'APPROVED')} aria-label="تأیید"><Check className="size-4" /></button>
                      <button type="button" className="indeed-btn indeed-btn-ghost" onClick={() => void review(payment, 'REJECTED')} aria-label="رد"><X className="size-4" /></button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <form onSubmit={addInstallment} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">زمان‌بندی قسط</h2>
          <select className={field} value={instForm.enrollmentId} onChange={(e) => setInstForm((p) => ({ ...p, enrollmentId: e.target.value }))} required>
            <option value="">انتخاب ثبت‌نام…</option>
            {balances.map((row) => (
              <option key={row.id} value={row.id}>{row.student?.fullName} — {row.class?.title}</option>
            ))}
          </select>
          <input className={field} placeholder="عنوان قسط" value={instForm.title} onChange={(e) => setInstForm((p) => ({ ...p, title: e.target.value }))} />
          <input className={field} type="number" placeholder="مبلغ" value={instForm.amount} onChange={(e) => setInstForm((p) => ({ ...p, amount: e.target.value }))} required />
          <input className={field} type="date" value={instForm.dueDate} onChange={(e) => setInstForm((p) => ({ ...p, dueDate: e.target.value }))} required />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت قسط</button>
        </form>

        <section className="indeed-panel p-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink">اقساط</h2>
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto text-xs">
            {installments.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 border-t border-[var(--vintage-border)] py-1">
                <span>
                  {row.enrollment?.student?.fullName ?? '—'} • {row.title} • {money(row.amount)}
                  <span className="text-muted"> ({new Date(row.dueDate).toLocaleDateString('fa-IR')})</span>
                </span>
                <span className="flex items-center gap-1">
                  {row.status === 'PAID' ? (
                    <span className="text-emerald-700">پرداخت‌شده</span>
                  ) : (
                    <button type="button" className="text-brand" onClick={() => void markInstallmentPaid(row)}>پرداخت شد</button>
                  )}
                  <button type="button" className="text-red-600" onClick={() => void removeInstallment(row.id)} aria-label="حذف"><Trash2 className="size-3" aria-hidden /></button>
                </span>
              </li>
            ))}
            {installments.length === 0 ? <li className="text-muted">قسطی ثبت نشده است.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
