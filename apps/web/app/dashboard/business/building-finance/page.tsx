'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type Building,
  type BuildingBudget,
  type BuildingContractor,
  type BuildingExpense,
  type BuildingFinanceOverview,
  type BuildingMeeting,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const MEETING_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'برنامه‌ریزی‌شده',
  DONE: 'برگزارشده',
  CANCELLED: 'لغوشده',
};

export default function BuildingFinancePage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [overview, setOverview] = useState<BuildingFinanceOverview | null>(null);
  const [expenses, setExpenses] = useState<BuildingExpense[]>([]);
  const [budgets, setBudgets] = useState<BuildingBudget[]>([]);
  const [meetings, setMeetings] = useState<BuildingMeeting[]>([]);
  const [contractors, setContractors] = useState<BuildingContractor[]>([]);
  const [form, setForm] = useState({ title: '', category: '', amount: '', vendor: '' });
  const [budgetForm, setBudgetForm] = useState({ year: String(new Date().getFullYear()), title: '', category: '', amount: '' });
  const [meetingForm, setMeetingForm] = useState({ title: '', scheduledAt: '', location: '', agenda: '' });
  const [contractorForm, setContractorForm] = useState({ name: '', specialty: '', phone: '', note: '' });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    const [o, e, b, m, c] = await Promise.all([
      api.get<BuildingFinanceOverview>(`/building-finance/overview/${id}`),
      api.get<BuildingExpense[]>(`/building-finance/expenses?buildingId=${id}`),
      api.get<BuildingBudget[]>(`/building-finance/${id}/budgets`),
      api.get<BuildingMeeting[]>(`/building-finance/${id}/meetings`),
      api.get<BuildingContractor[]>(`/building-finance/${id}/contractors`),
    ]);
    setOverview(o);
    setExpenses(e);
    setBudgets(b);
    setMeetings(m);
    setContractors(c);
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

  async function addBudget(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId) return;
    await api.post(`/building-finance/${buildingId}/budgets`, {
      year: Number(budgetForm.year) || new Date().getFullYear(),
      title: budgetForm.title.trim(),
      category: budgetForm.category.trim() || undefined,
      amount: Number(budgetForm.amount) || 0,
    });
    setBudgetForm((p) => ({ ...p, title: '', category: '', amount: '' }));
    await load(buildingId);
    toast.success('ردیف بودجه ثبت شد');
  }

  async function removeBudget(id: string) {
    await api.delete(`/building-finance/budgets/${id}`);
    await load(buildingId);
  }

  async function addMeeting(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId) return;
    await api.post(`/building-finance/${buildingId}/meetings`, {
      title: meetingForm.title.trim(),
      scheduledAt: new Date(meetingForm.scheduledAt).toISOString(),
      location: meetingForm.location.trim() || undefined,
      agenda: meetingForm.agenda.trim() || undefined,
    });
    setMeetingForm({ title: '', scheduledAt: '', location: '', agenda: '' });
    await load(buildingId);
    toast.success('جلسه ثبت شد');
  }

  async function markMeetingDone(meeting: BuildingMeeting) {
    await api.patch(`/building-finance/meetings/${meeting.id}`, { status: 'DONE' });
    await load(buildingId);
  }

  async function removeMeeting(id: string) {
    await api.delete(`/building-finance/meetings/${id}`);
    await load(buildingId);
  }

  async function addContractor(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId) return;
    await api.post(`/building-finance/${buildingId}/contractors`, {
      name: contractorForm.name.trim(),
      specialty: contractorForm.specialty.trim() || undefined,
      phone: contractorForm.phone.trim() || undefined,
      note: contractorForm.note.trim() || undefined,
    });
    setContractorForm({ name: '', specialty: '', phone: '', note: '' });
    await load(buildingId);
    toast.success('پیمانکار ثبت شد');
  }

  async function removeContractor(id: string) {
    await api.delete(`/building-finance/contractors/${id}`);
    await load(buildingId);
  }

  const budgetPlanned = budgets.reduce((sum, row) => sum + row.amount, 0);

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

      {buildingId ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="indeed-btn indeed-btn-ghost text-xs"
            onClick={() => void api.download(`/building-finance/export/payments?buildingId=${buildingId}`, 'building-payments.csv')}
          >
            خروجی CSV پرداخت‌ها
          </button>
        </div>
      ) : null}

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

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addBudget} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">افزودن ردیف بودجه</h2>
          <input className={field} type="number" placeholder="سال (شمسی)" value={budgetForm.year} onChange={(e) => setBudgetForm((p) => ({ ...p, year: e.target.value }))} required />
          <input className={field} placeholder="عنوان ردیف" value={budgetForm.title} onChange={(e) => setBudgetForm((p) => ({ ...p, title: e.target.value }))} required />
          <input className={field} placeholder="دسته (اختیاری)" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))} />
          <input className={field} type="number" placeholder="مبلغ پیش‌بینی‌شده" value={budgetForm.amount} onChange={(e) => setBudgetForm((p) => ({ ...p, amount: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت بودجه</button>
        </form>

        <section className="indeed-panel p-4">
          <h2 className="mb-1 text-sm font-extrabold text-ink">بودجه‌ی سالانه</h2>
          <p className="mb-3 text-xs text-muted">جمع پیش‌بینی: {budgetPlanned.toLocaleString('fa-IR')}</p>
          <ul className="divide-y divide-[var(--vintage-border)] text-xs">
            {budgets.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-ink">{row.title} <span className="text-muted">• {row.year}{row.category ? ` • ${row.category}` : ''}</span></span>
                <span className="flex items-center gap-2 text-muted">
                  {row.amount.toLocaleString('fa-IR')}
                  <button type="button" onClick={() => void removeBudget(row.id)} className="text-red-600" aria-label="حذف"><Trash2 className="size-3" aria-hidden /></button>
                </span>
              </li>
            ))}
            {budgets.length === 0 ? <li className="py-2 text-muted">ردیف بودجه‌ای ثبت نشده است.</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addMeeting} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">ثبت جلسه</h2>
          <input className={field} placeholder="عنوان جلسه" value={meetingForm.title} onChange={(e) => setMeetingForm((p) => ({ ...p, title: e.target.value }))} required />
          <input className={field} type="datetime-local" value={meetingForm.scheduledAt} onChange={(e) => setMeetingForm((p) => ({ ...p, scheduledAt: e.target.value }))} required />
          <input className={field} placeholder="محل برگزاری" value={meetingForm.location} onChange={(e) => setMeetingForm((p) => ({ ...p, location: e.target.value }))} />
          <textarea className={field} rows={2} placeholder="دستور جلسه" value={meetingForm.agenda} onChange={(e) => setMeetingForm((p) => ({ ...p, agenda: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت جلسه</button>
        </form>

        <section className="indeed-panel p-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink">جلسات و صورت‌جلسه‌ها</h2>
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto text-xs">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="rounded-lg border border-[var(--vintage-border)] p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{meeting.title}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', meeting.status === 'DONE' ? 'bg-emerald-50 text-emerald-700' : meeting.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                    {MEETING_STATUS_LABELS[meeting.status] ?? meeting.status}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {new Date(meeting.scheduledAt).toLocaleString('fa-IR')}
                  {meeting.location ? ` • ${meeting.location}` : ''}
                </p>
                {meeting.agenda ? <p className="mt-1 text-muted">دستور: {meeting.agenda}</p> : null}
                <div className="mt-1 flex gap-2">
                  {meeting.status !== 'DONE' ? (
                    <button type="button" onClick={() => void markMeetingDone(meeting)} className="indeed-btn indeed-btn-primary py-0.5 text-[10px]"><Check className="size-3" aria-hidden /> برگزار شد</button>
                  ) : null}
                  <button type="button" onClick={() => void removeMeeting(meeting.id)} className="indeed-btn py-0.5 text-[10px] text-red-600"><Trash2 className="size-3" aria-hidden /> حذف</button>
                </div>
              </li>
            ))}
            {meetings.length === 0 ? <li className="text-muted">جلسه‌ای ثبت نشده است.</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addContractor} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">افزودن پیمانکار</h2>
          <input className={field} placeholder="نام" value={contractorForm.name} onChange={(e) => setContractorForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className={field} placeholder="تخصص (برق، تاسیسات، …)" value={contractorForm.specialty} onChange={(e) => setContractorForm((p) => ({ ...p, specialty: e.target.value }))} />
          <input className={field} placeholder="شماره تماس" value={contractorForm.phone} onChange={(e) => setContractorForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className={field} placeholder="یادداشت" value={contractorForm.note} onChange={(e) => setContractorForm((p) => ({ ...p, note: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت پیمانکار</button>
        </form>

        <section className="indeed-panel p-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink">پیمانکاران</h2>
          <ul className="divide-y divide-[var(--vintage-border)] text-xs">
            {contractors.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-ink">{row.name}{row.specialty ? ` • ${row.specialty}` : ''}{row.phone ? ` • ${row.phone}` : ''}</span>
                <button type="button" onClick={() => void removeContractor(row.id)} className="text-red-600" aria-label="حذف"><Trash2 className="size-3" aria-hidden /></button>
              </li>
            ))}
            {contractors.length === 0 ? <li className="py-2 text-muted">پیمانکاری ثبت نشده است.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
