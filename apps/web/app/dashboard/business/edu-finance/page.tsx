'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type EduClass,
  type EduCoachSettlement,
  type EduExpense,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;

const BASES: Record<string, string> = { FIXED: 'ثابت', PER_SESSION: 'به ازای جلسه', PERCENT: 'درصدی' };

export default function EduFinancePage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [expenses, setExpenses] = useState<EduExpense[]>([]);
  const [settlements, setSettlements] = useState<EduCoachSettlement[]>([]);
  const [expenseForm, setExpenseForm] = useState({ title: '', classId: '', amount: '', category: '' });
  const [settleForm, setSettleForm] = useState({ coachName: '', classId: '', basis: 'PER_SESSION', amount: '', period: '' });

  const load = useCallback(async () => {
    const [c, e, s] = await Promise.all([
      api.get<EduClass[]>('/edu-classes'),
      api.get<EduExpense[]>('/edu-finance/expenses'),
      api.get<EduCoachSettlement[]>('/edu-finance/settlements'),
    ]);
    setClasses(c);
    setExpenses(e);
    setSettlements(s);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/edu-finance');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function addExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) return;
    await api.post('/edu-finance/expenses', {
      title: expenseForm.title.trim(),
      classId: expenseForm.classId || undefined,
      amount: Number(expenseForm.amount),
      category: expenseForm.category.trim() || undefined,
    });
    setExpenseForm({ title: '', classId: '', amount: '', category: '' });
    await load();
    toast.success('هزینه ثبت شد');
  }

  async function addSettlement(event: React.FormEvent) {
    event.preventDefault();
    if (!settleForm.coachName.trim()) return;
    await api.post('/edu-finance/settlements', {
      coachName: settleForm.coachName.trim(),
      classId: settleForm.classId || undefined,
      basis: settleForm.basis,
      amount: settleForm.amount ? Number(settleForm.amount) : undefined,
      period: settleForm.period.trim() || undefined,
    });
    setSettleForm({ coachName: '', classId: '', basis: 'PER_SESSION', amount: '', period: '' });
    await load();
    toast.success('تسویه ثبت شد');
  }

  async function setSettlementStatus(row: EduCoachSettlement, status: string) {
    await api.patch(`/edu-finance/settlements/${row.id}`, { status });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">هزینه و تسویه مربی</h1>
        <p className="mt-1 text-sm text-muted">
          ثبت هزینه‌ی کلاس (سالن، مواد، دستمزد) و تسویه‌ی مربی بر مبنای جلسه/درصد/ثابت.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <form onSubmit={addExpense} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">هزینه‌ی کلاس</h2>
          <input className={field} placeholder="عنوان هزینه" value={expenseForm.title} onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))} required />
          <select className={field} value={expenseForm.classId} onChange={(e) => setExpenseForm((p) => ({ ...p, classId: e.target.value }))}>
            <option value="">هزینه‌ی عمومی</option>
            {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.title}</option>)}
          </select>
          <input className={field} placeholder="مبلغ" inputMode="numeric" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} required />
          <input className={field} placeholder="دسته" value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت هزینه</button>
        </form>

        <form onSubmit={addSettlement} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">تسویه‌ی مربی</h2>
          <input className={field} placeholder="نام مربی" value={settleForm.coachName} onChange={(e) => setSettleForm((p) => ({ ...p, coachName: e.target.value }))} required />
          <select className={field} value={settleForm.classId} onChange={(e) => setSettleForm((p) => ({ ...p, classId: e.target.value }))}>
            <option value="">همه‌ی کلاس‌ها</option>
            {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.title}</option>)}
          </select>
          <select className={field} value={settleForm.basis} onChange={(e) => setSettleForm((p) => ({ ...p, basis: e.target.value }))}>
            {Object.entries(BASES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className={field} placeholder="مبلغ" inputMode="numeric" value={settleForm.amount} onChange={(e) => setSettleForm((p) => ({ ...p, amount: e.target.value }))} />
          <input className={field} placeholder="دوره (مثلاً 1405-09)" value={settleForm.period} onChange={(e) => setSettleForm((p) => ({ ...p, period: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت تسویه</button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="indeed-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">هزینه‌ها</h2>
          {expenses.length === 0 ? <p className="mt-2 text-xs text-muted">هزینه‌ای ثبت نشده است.</p> : (
            <ul className="mt-2 flex flex-col gap-1 text-xs">
              {expenses.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <span>{row.title}{row.class ? ` • ${row.class.title}` : ''}</span>
                  <span className="text-muted">{money(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="indeed-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">تسویه‌ها</h2>
          {settlements.length === 0 ? <p className="mt-2 text-xs text-muted">تسویه‌ای ثبت نشده است.</p> : (
            <ul className="mt-2 flex flex-col gap-2 text-xs">
              {settlements.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p>{row.coachName} • {money(row.amount)}</p>
                    <p className="text-[10px] text-muted">{BASES[row.basis] ?? row.basis}{row.period ? ` • ${row.period}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', row.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                      {row.status === 'SETTLED' ? 'تسویه‌شده' : 'در انتظار'}
                    </span>
                    <select className={field} value={row.status} onChange={(e) => void setSettlementStatus(row, e.target.value)}>
                      <option value="PENDING">در انتظار</option>
                      <option value="SETTLED">تسویه‌شده</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
