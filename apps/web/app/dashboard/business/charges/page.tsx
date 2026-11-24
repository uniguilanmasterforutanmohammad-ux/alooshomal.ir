'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type Building,
  type BuildingCharge,
  type BuildingPayment,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const STATUS_LABELS: Record<string, string> = {
  UNPAID: 'پرداخت‌نشده',
  PARTIAL: 'ناقص',
  PAID: 'تسویه‌شده',
  CANCELLED: 'لغوشده',
};

export default function ChargesPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [building, setBuilding] = useState<Building | null>(null);
  const [charges, setCharges] = useState<BuildingCharge[]>([]);
  const [payments, setPayments] = useState<BuildingPayment[]>([]);
  const [summary, setSummary] = useState<{ total: number; paid: number; outstanding: number } | null>(null);
  const [bulk, setBulk] = useState({ title: 'شارژ ماهانه', period: '', amountPerUnit: '', amountPerSqm: '' });
  const [single, setSingle] = useState({ unitId: '', title: 'هزینه‌ی موردی', amount: '' });
  const [payForm, setPayForm] = useState({ unitId: '', chargeId: '', amount: '', trackingNumber: '' });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    const [b, c, p, s] = await Promise.all([
      api.get<Building>(`/buildings/${id}`),
      api.get<BuildingCharge[]>(`/building-charges?buildingId=${id}`),
      api.get<BuildingPayment[]>(`/building-charges/payments?buildingId=${id}`),
      api.get<{ total: number; paid: number; outstanding: number }>(`/building-charges/summary/${id}`),
    ]);
    setBuilding(b);
    setCharges(c);
    setPayments(p);
    setSummary(s);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/charges');
      return;
    }
    if (!enabled) return;
    api.get<Building[]>('/buildings').then((rows) => {
      setBuildings(rows);
      if (rows[0]) {
        setBuildingId(rows[0].id);
        void load(rows[0].id);
      }
    });
  }, [hydrated, token, router, enabled, load]);

  async function issueBulk(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId) return;
    const result = await api.post<{ created: number; skipped: number }>('/building-charges/bulk', {
      buildingId,
      title: bulk.title.trim(),
      period: bulk.period.trim() || undefined,
      amountPerUnit: bulk.amountPerUnit ? Number(bulk.amountPerUnit) : undefined,
      amountPerSqm: bulk.amountPerSqm ? Number(bulk.amountPerSqm) : undefined,
    });
    toast.success(`${result.created} شارژ صادر شد`);
    await load(buildingId);
  }

  async function issueSingle(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId || !single.unitId) return;
    await api.post('/building-charges', {
      buildingId,
      unitId: single.unitId,
      title: single.title.trim(),
      amount: Number(single.amount) || 0,
    });
    setSingle((p) => ({ ...p, amount: '' }));
    await load(buildingId);
    toast.success('شارژ ثبت شد');
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId || !payForm.unitId) return;
    await api.post('/building-charges/payments', {
      buildingId,
      unitId: payForm.unitId,
      chargeId: payForm.chargeId || undefined,
      amount: Number(payForm.amount) || 0,
      trackingNumber: payForm.trackingNumber.trim() || undefined,
    });
    setPayForm((p) => ({ ...p, amount: '', trackingNumber: '' }));
    await load(buildingId);
    toast.success('پرداخت ثبت شد (در انتظار بررسی)');
  }

  async function review(payment: BuildingPayment, status: 'APPROVED' | 'REJECTED') {
    await api.patch(`/building-charges/payments/${payment.id}`, { status });
    await load(buildingId);
    toast.success(status === 'APPROVED' ? 'پرداخت تأیید شد' : 'پرداخت رد شد');
  }

  const units = building?.units ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">شارژ و صورتحساب</h1>
        <p className="mt-1 text-sm text-muted">
          صدور شارژ، مطالبات هر واحد و تطبیق پرداخت‌ها. رسید به‌تنهایی تسویه نیست.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <select
        className={field}
        value={buildingId}
        onChange={(event) => {
          setBuildingId(event.target.value);
          void load(event.target.value);
        }}
      >
        <option value="">انتخاب ساختمان…</option>
        {buildings.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="indeed-panel p-4"><p className="text-xs text-muted">کل شارژ</p><p className="text-lg font-extrabold text-ink">{summary.total.toLocaleString('fa-IR')}</p></div>
          <div className="indeed-panel p-4"><p className="text-xs text-muted">وصول‌شده</p><p className="text-lg font-extrabold text-emerald-700">{summary.paid.toLocaleString('fa-IR')}</p></div>
          <div className="indeed-panel p-4"><p className="text-xs text-muted">مانده مطالبات</p><p className="text-lg font-extrabold text-amber-700">{summary.outstanding.toLocaleString('fa-IR')}</p></div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={issueBulk} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">صدور گروهی شارژ</h2>
          <input className={field} placeholder="عنوان" value={bulk.title} onChange={(e) => setBulk((p) => ({ ...p, title: e.target.value }))} />
          <input className={field} placeholder="دوره (مثلاً 1405-09)" value={bulk.period} onChange={(e) => setBulk((p) => ({ ...p, period: e.target.value }))} />
          <input className={field} type="number" placeholder="مبلغ ثابت هر واحد" value={bulk.amountPerUnit} onChange={(e) => setBulk((p) => ({ ...p, amountPerUnit: e.target.value }))} />
          <input className={field} type="number" placeholder="یا مبلغ به ازای هر متر مربع" value={bulk.amountPerSqm} onChange={(e) => setBulk((p) => ({ ...p, amountPerSqm: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">صدور برای واحدهای فعال</button>
        </form>

        <form onSubmit={issueSingle} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">شارژ تک‌واحد</h2>
          <select className={field} value={single.unitId} onChange={(e) => setSingle((p) => ({ ...p, unitId: e.target.value }))} required>
            <option value="">انتخاب واحد…</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>واحد {unit.unitNumber}</option>)}
          </select>
          <input className={field} placeholder="عنوان" value={single.title} onChange={(e) => setSingle((p) => ({ ...p, title: e.target.value }))} />
          <input className={field} type="number" placeholder="مبلغ" value={single.amount} onChange={(e) => setSingle((p) => ({ ...p, amount: e.target.value }))} required />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت شارژ</button>
        </form>
      </div>

      <section className="indeed-panel p-4">
        <h2 className="mb-3 text-sm font-extrabold text-ink">شارژها</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-muted"><th className="p-2 text-start">واحد</th><th className="p-2 text-start">عنوان</th><th className="p-2 text-start">مبلغ</th><th className="p-2 text-start">پرداخت‌شده</th><th className="p-2 text-start">وضعیت</th></tr></thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} className="border-t border-[var(--vintage-border)]">
                  <td className="p-2 text-ink">{charge.unit?.unitNumber ?? '—'}</td>
                  <td className="p-2">{charge.title}{charge.period ? ` (${charge.period})` : ''}</td>
                  <td className="p-2">{charge.amount.toLocaleString('fa-IR')}</td>
                  <td className="p-2">{charge.paidAmount.toLocaleString('fa-IR')}</td>
                  <td className="p-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', charge.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : charge.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                      {STATUS_LABELS[charge.status] ?? charge.status}
                    </span>
                  </td>
                </tr>
              ))}
              {charges.length === 0 ? <tr><td colSpan={5} className="p-3 text-center text-muted">شارژی ثبت نشده است.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={recordPayment} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">ثبت پرداخت/رسید</h2>
          <select className={field} value={payForm.unitId} onChange={(e) => setPayForm((p) => ({ ...p, unitId: e.target.value }))} required>
            <option value="">انتخاب واحد…</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>واحد {unit.unitNumber}</option>)}
          </select>
          <select className={field} value={payForm.chargeId} onChange={(e) => setPayForm((p) => ({ ...p, chargeId: e.target.value }))}>
            <option value="">بدون اتصال به شارژ</option>
            {charges.filter((c) => !payForm.unitId || c.unitId === payForm.unitId).map((c) => (
              <option key={c.id} value={c.id}>{c.title} — {c.amount.toLocaleString('fa-IR')}</option>
            ))}
          </select>
          <input className={field} type="number" placeholder="مبلغ" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} required />
          <input className={field} placeholder="شماره پیگیری (اختیاری)" value={payForm.trackingNumber} onChange={(e) => setPayForm((p) => ({ ...p, trackingNumber: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت پرداخت</button>
        </form>

        <section className="indeed-panel p-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink">پرداخت‌ها</h2>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-[var(--vintage-border)] p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">واحد {payment.unit?.unitNumber ?? '—'} — {payment.amount.toLocaleString('fa-IR')}</span>
                  <span className="text-muted">{payment.status === 'PENDING' ? 'در انتظار' : payment.status === 'APPROVED' ? 'تأییدشده' : 'ردشده'}</span>
                </div>
                {payment.status === 'PENDING' ? (
                  <div className="mt-1 flex gap-2">
                    <button type="button" onClick={() => void review(payment, 'APPROVED')} className="indeed-btn indeed-btn-primary py-0.5 text-[10px]"><Check className="size-3" aria-hidden /> تأیید</button>
                    <button type="button" onClick={() => void review(payment, 'REJECTED')} className="indeed-btn py-0.5 text-[10px] text-red-600"><X className="size-3" aria-hidden /> رد</button>
                  </div>
                ) : null}
              </div>
            ))}
            {payments.length === 0 ? <p className="text-xs text-muted">پرداختی ثبت نشده است.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
