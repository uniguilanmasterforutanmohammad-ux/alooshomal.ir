'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type Building,
  type BuildingExpense,
  type BuildingFinanceOverview,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

export default function BuildingFinancePage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [overview, setOverview] = useState<BuildingFinanceOverview | null>(null);
  const [expenses, setExpenses] = useState<BuildingExpense[]>([]);
  const [form, setForm] = useState({ title: '', category: '', amount: '', vendor: '' });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    const [o, e] = await Promise.all([
      api.get<BuildingFinanceOverview>(`/building-finance/overview/${id}`),
      api.get<BuildingExpense[]>(`/building-finance/expenses?buildingId=${id}`),
    ]);
    setOverview(o);
    setExpenses(e);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/building-finance');
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

  async function addExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId) return;
    await api.post('/building-finance/expenses', {
      buildingId,
      title: form.title.trim(),
      category: form.category.trim() || undefined,
      amount: Number(form.amount) || 0,
      vendor: form.vendor.trim() || undefined,
    });
    setForm({ title: '', category: '', amount: '', vendor: '' });
    await load(buildingId);
    toast.success('هزینه ثبت شد');
  }

  async function removeExpense(id: string) {
    if (!window.confirm('این هزینه حذف شود؟')) return;
    await api.delete(`/building-finance/expenses/${id}`);
    await load(buildingId);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">حسابداری ساختمان</h1>
        <p className="mt-1 text-sm text-muted">
          وصولی‌ها، هزینه‌ها و مانده صندوق هر ساختمان به‌صورت جداگانه.
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
        {buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="indeed-panel p-4"><p className="text-xs text-muted">کل شارژ صادرشده</p><p className="text-lg font-extrabold text-ink">{overview.charged.toLocaleString('fa-IR')}</p></div>
          <div className="indeed-panel p-4"><p className="text-xs text-muted">وصول‌شده</p><p className="text-lg font-extrabold text-emerald-700">{overview.collected.toLocaleString('fa-IR')}</p></div>
          <div className="indeed-panel p-4"><p className="text-xs text-muted">هزینه‌ها</p><p className="text-lg font-extrabold text-red-600">{overview.spent.toLocaleString('fa-IR')}</p></div>
          <div className="indeed-panel p-4"><p className="text-xs text-muted">مانده صندوق</p><p className="text-lg font-extrabold text-brand">{overview.balance.toLocaleString('fa-IR')}</p></div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <form onSubmit={addExpense} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">ثبت هزینه</h2>
          <input className={field} placeholder="عنوان" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <input className={field} placeholder="دسته (تعمیرات، قبض، …)" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          <input className={field} type="number" placeholder="مبلغ" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
          <input className={field} placeholder="پیمانکار/فروشنده" value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت هزینه</button>
        </form>

        <section className="indeed-panel p-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink">هزینه‌ها</h2>
          <ul className="divide-y divide-[var(--vintage-border)] text-xs">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-ink">{expense.title}{expense.category ? ` • ${expense.category}` : ''}</span>
                <span className="flex items-center gap-2 text-muted">
                  {expense.amount.toLocaleString('fa-IR')}
                  <button type="button" onClick={() => void removeExpense(expense.id)} className="text-red-600" aria-label="حذف"><Trash2 className="size-3" aria-hidden /></button>
                </span>
              </li>
            ))}
            {expenses.length === 0 ? <li className="py-2 text-muted">هزینه‌ای ثبت نشده است.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
