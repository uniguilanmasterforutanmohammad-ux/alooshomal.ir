'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api, type PublicStudentPanel } from '@/lib/api';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;

const PAY_STATUS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  PAID: 'پرداخت‌شده',
};

export default function StudentPanelPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<PublicStudentPanel | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ enrollmentId: '', amount: '', trackingNumber: '' });

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.get<PublicStudentPanel>(`/public/edu/student/${token}`));
    } catch {
      setError('این لینک معتبر نیست یا منقضی شده است.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !form.enrollmentId || !form.amount) return;
    await api.post(`/public/edu/student/${token}/payments`, {
      enrollmentId: form.enrollmentId,
      amount: Number(form.amount),
      trackingNumber: form.trackingNumber.trim() || undefined,
    });
    setForm({ enrollmentId: '', amount: '', trackingNumber: '' });
    await load();
    toast.success('رسید ثبت شد؛ پس از تأیید آموزشگاه تسویه می‌شود');
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
        <h1 className="text-xl font-extrabold text-ink">{data.student.fullName}</h1>
        <p className="mt-1 text-sm text-muted">
          {data.studio}
          {data.student.guardianName ? ` • ولی: ${data.student.guardianName}` : ''}
        </p>
      </header>

      {data.upcoming.length > 0 ? (
        <section className="indeed-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">جلسات پیش‌رو</h2>
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {data.upcoming.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-2">
                <span>{session.topic ?? 'جلسه'}</span>
                <span className="text-muted">{new Date(session.scheduledAt).toLocaleString('fa-IR')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.enrollments.map((enrollment) => {
        const total = enrollment.price - enrollment.discount;
        const balance = Math.max(total - enrollment.paidAmount, 0);
        return (
          <section key={enrollment.id} className="indeed-panel flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-ink">{enrollment.class.title}</h2>
              <span className="text-xs text-muted">{enrollment.usedSessions}/{enrollment.packageSessions} جلسه</span>
            </div>
            <p className="text-xs text-ink">مانده: {balance > 0 ? money(balance) : 'تسویه'}</p>

            {enrollment.installments.length > 0 ? (
              <ul className="flex flex-col gap-1 text-xs">
                {enrollment.installments.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span>{item.title} • {money(item.amount)}</span>
                    <span className="text-muted">
                      {new Date(item.dueDate).toLocaleDateString('fa-IR')} • {PAY_STATUS[item.status] ?? item.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {enrollment.progress.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold text-ink">پیشرفت</h3>
                <ul className="mt-1 flex flex-col gap-1 text-[11px] text-muted">
                  {enrollment.progress.map((note) => (
                    <li key={note.id}>
                      {new Date(note.date).toLocaleDateString('fa-IR')}
                      {note.topic ? ` • ${note.topic}` : ''}
                      {note.feedback ? ` — ${note.feedback}` : ''}
                      {note.mediaUrl ? (
                        <>
                          {' '}
                          <a className="text-brand underline" href={note.mediaUrl} target="_blank" rel="noreferrer">رسانه</a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}

      <form onSubmit={submit} className="indeed-panel grid gap-2 p-4">
        <h2 className="text-sm font-extrabold text-ink">ثبت رسید پرداخت</h2>
        <select className={field} value={form.enrollmentId} onChange={(e) => setForm((p) => ({ ...p, enrollmentId: e.target.value }))} required>
          <option value="">انتخاب کلاس…</option>
          {data.enrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>{enrollment.class.title}</option>
          ))}
        </select>
        <input className={field} placeholder="مبلغ" inputMode="numeric" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
        <input className={field} placeholder="شماره پیگیری" value={form.trackingNumber} onChange={(e) => setForm((p) => ({ ...p, trackingNumber: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary">ثبت رسید</button>
      </form>
    </main>
  );
}
