'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type PropertyFile, type PropertyLead } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'جدید',
  ACTIVE: 'در حال پیگیری',
  VISIT: 'در مرحله‌ی بازدید',
  DEAL: 'معامله‌شده',
  LOST: 'از دست رفته',
};

const KIND_LABELS: Record<string, string> = { BUY: 'خرید', RENT: 'اجاره' };

const money = (value: number | null) =>
  value == null ? '—' : `${value.toLocaleString('fa-IR')} تومان`;

const emptyForm = {
  name: '',
  phone: '',
  kind: 'BUY',
  budgetMin: '',
  budgetMax: '',
  depositMax: '',
  rentMax: '',
  neighborhoods: '',
  minArea: '',
  notes: '',
};

export default function PropertyLeadsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [matches, setMatches] = useState<{ lead: PropertyLead; files: PropertyFile[] } | null>(null);

  const load = useCallback(async () => {
    setLeads(await api.get<PropertyLead[]>('/property-leads'));
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/property-leads');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await api.post('/property-leads', {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      kind: form.kind,
      budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      depositMax: form.depositMax ? Number(form.depositMax) : undefined,
      rentMax: form.rentMax ? Number(form.rentMax) : undefined,
      neighborhoods: form.neighborhoods
        .split(/[،,]/)
        .map((part) => part.trim())
        .filter(Boolean),
      minArea: form.minArea ? Number(form.minArea) : undefined,
      notes: form.notes.trim() || undefined,
    });
    setForm(emptyForm);
    await load();
    toast.success('تقاضا ثبت شد');
  }

  async function setLeadStatus(lead: PropertyLead, status: string) {
    await api.patch(`/property-leads/${lead.id}`, { status });
    await load();
  }

  async function showMatches(lead: PropertyLead) {
    const files = await api.get<PropertyFile[]>(`/property-leads/${lead.id}/matches`);
    setMatches({ lead, files });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">مشتریان و تقاضاها</h1>
        <p className="mt-1 text-sm text-muted">
          ثبت خریدار/مستأجر، بودجه و محله‌های مدنظر و تطبیق با فایل‌های فعال.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={create} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <input className={field} placeholder="نام مشتری" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className={field} placeholder="شماره تماس" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        <select className={field} value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
          {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className={field} placeholder="محله‌ها (با ویرگول)" value={form.neighborhoods} onChange={(e) => setForm((p) => ({ ...p, neighborhoods: e.target.value }))} />
        <input className={field} placeholder="حداقل بودجه" inputMode="numeric" value={form.budgetMin} onChange={(e) => setForm((p) => ({ ...p, budgetMin: e.target.value }))} />
        <input className={field} placeholder="حداکثر بودجه" inputMode="numeric" value={form.budgetMax} onChange={(e) => setForm((p) => ({ ...p, budgetMax: e.target.value }))} />
        <input className={field} placeholder="حداکثر رهن" inputMode="numeric" value={form.depositMax} onChange={(e) => setForm((p) => ({ ...p, depositMax: e.target.value }))} />
        <input className={field} placeholder="حداکثر اجاره" inputMode="numeric" value={form.rentMax} onChange={(e) => setForm((p) => ({ ...p, rentMax: e.target.value }))} />
        <input className={field} placeholder="حداقل متراژ" inputMode="numeric" value={form.minArea} onChange={(e) => setForm((p) => ({ ...p, minArea: e.target.value }))} />
        <input className={`${field} md:col-span-2`} placeholder="یادداشت" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت تقاضا</button>
      </form>

      {matches ? (
        <section className="indeed-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-ink">فایل‌های متناسب با «{matches.lead.name}»</h2>
            <button type="button" className="text-xs text-muted" onClick={() => setMatches(null)}>بستن</button>
          </div>
          {matches.files.length === 0 ? (
            <p className="mt-2 text-xs text-muted">فایل فعال متناسبی پیدا نشد.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {matches.files.map((file) => (
                <li key={file.id} className="flex items-center justify-between text-xs">
                  <span>{file.title}</span>
                  <span className="text-muted">{file.neighborhood ?? '—'} • {file.price != null ? money(file.price) : money(file.deposit)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {leads.map((lead) => (
          <article key={lead.id} className="indeed-panel flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-ink">{lead.name}</h3>
                <p className="text-[11px] text-muted">
                  {KIND_LABELS[lead.kind] ?? lead.kind}
                  {lead.phone ? ` • ${lead.phone}` : ''}
                  {lead.neighborhoods.length ? ` • ${lead.neighborhoods.join('، ')}` : ''}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', lead.status === 'DEAL' ? 'bg-emerald-50 text-emerald-700' : lead.status === 'LOST' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700')}>
                {STATUS_LABELS[lead.status] ?? lead.status}
              </span>
            </div>
            <p className="text-xs text-ink">
              {lead.kind === 'BUY'
                ? `بودجه: ${money(lead.budgetMin)} تا ${money(lead.budgetMax)}`
                : `رهن تا ${money(lead.depositMax)} • اجاره تا ${money(lead.rentMax)}`}
            </p>
            {lead.notes ? <p className="text-[11px] text-muted">{lead.notes}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select className={field} value={lead.status} onChange={(e) => void setLeadStatus(lead, e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void showMatches(lead)}>تطبیق فایل</button>
            </div>
          </article>
        ))}
        {leads.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted md:col-span-2">تقاضایی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
