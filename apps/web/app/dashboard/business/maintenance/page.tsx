'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type Building, type BuildingTicket } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال انجام',
  DONE: 'انجام‌شده',
  CANCELLED: 'لغوشده',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'کم',
  NORMAL: 'معمولی',
  HIGH: 'زیاد',
  URGENT: 'فوری',
};

export default function MaintenancePage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [tickets, setTickets] = useState<BuildingTicket[]>([]);
  const [form, setForm] = useState({ title: '', description: '', priority: 'NORMAL', assignee: '' });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setTickets(await api.get<BuildingTicket[]>(`/building-maintenance?buildingId=${id}`));
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/maintenance');
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

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!buildingId || !form.title.trim()) return;
    await api.post('/building-maintenance', {
      buildingId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      assignee: form.assignee.trim() || undefined,
    });
    setForm({ title: '', description: '', priority: 'NORMAL', assignee: '' });
    await load(buildingId);
    toast.success('درخواست ثبت شد');
  }

  async function setStatus(ticket: BuildingTicket, status: string) {
    await api.patch(`/building-maintenance/${ticket.id}`, { status });
    await load(buildingId);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">خرابی و نگهداری</h1>
        <p className="mt-1 text-sm text-muted">
          ثبت خرابی با اولویت و مسئول، پیگیری تا رفع مشکل و ثبت هزینه‌ی نهایی.
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

      <form onSubmit={create} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <input className={field} placeholder="عنوان خرابی" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <select className={field} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className={field} placeholder="مسئول پیگیری" value={form.assignee} onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت</button>
        <textarea className={`${field} md:col-span-4`} rows={2} placeholder="توضیحات" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
      </form>

      <div className="flex flex-col gap-2">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <h3 className="text-sm font-extrabold text-ink">{ticket.title}</h3>
              <p className="text-[11px] text-muted">
                {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                {ticket.assignee ? ` • مسئول: ${ticket.assignee}` : ''}
                {ticket.unit ? ` • واحد ${ticket.unit.unitNumber}` : ''}
              </p>
              {ticket.description ? <p className="mt-1 text-xs text-muted">{ticket.description}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', ticket.status === 'DONE' ? 'bg-emerald-50 text-emerald-700' : ticket.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                {STATUS_LABELS[ticket.status] ?? ticket.status}
              </span>
              <select className={field} value={ticket.status} onChange={(event) => void setStatus(ticket, event.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </article>
        ))}
        {tickets.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted">درخواستی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
