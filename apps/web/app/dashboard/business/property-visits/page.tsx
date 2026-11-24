'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type PropertyFile, type PropertyLead, type PropertyVisit } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'زمان‌بندی‌شده',
  DONE: 'انجام‌شده',
  CANCELLED: 'لغوشده',
  NO_SHOW: 'عدم حضور',
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

export default function PropertyVisitsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [files, setFiles] = useState<PropertyFile[]>([]);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [form, setForm] = useState({ propertyId: '', leadId: '', scheduledAt: '', feedback: '' });

  const load = useCallback(async () => {
    const [v, f, l] = await Promise.all([
      api.get<PropertyVisit[]>('/property-visits'),
      api.get<PropertyFile[]>('/property-files?status=ACTIVE'),
      api.get<PropertyLead[]>('/property-leads'),
    ]);
    setVisits(v);
    setFiles(f);
    setLeads(l);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/property-visits');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.propertyId || !form.leadId || !form.scheduledAt) return;
    await api.post('/property-visits', {
      propertyId: form.propertyId,
      leadId: form.leadId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      feedback: form.feedback.trim() || undefined,
    });
    setForm({ propertyId: '', leadId: '', scheduledAt: '', feedback: '' });
    await load();
    toast.success('بازدید ثبت شد');
  }

  async function setStatus(visit: PropertyVisit, status: string) {
    await api.patch(`/property-visits/${visit.id}`, { status });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">بازدید و مذاکره</h1>
        <p className="mt-1 text-sm text-muted">
          هماهنگی زمان بازدید، ثبت نتیجه و پیشنهاد قیمت با اتصال به فایل و تقاضا.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={create} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <select className={field} value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))} required>
          <option value="">انتخاب فایل…</option>
          {files.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}
        </select>
        <select className={field} value={form.leadId} onChange={(e) => setForm((p) => ({ ...p, leadId: e.target.value }))} required>
          <option value="">انتخاب مشتری…</option>
          {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
        </select>
        <input className={field} type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} required />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت بازدید</button>
        <input className={`${field} md:col-span-4`} placeholder="توضیح/هماهنگی" value={form.feedback} onChange={(e) => setForm((p) => ({ ...p, feedback: e.target.value }))} />
      </form>

      <div className="flex flex-col gap-2">
        {visits.map((visit) => (
          <article key={visit.id} className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <h3 className="text-sm font-extrabold text-ink">{visit.property?.title ?? 'فایل حذف‌شده'}</h3>
              <p className="text-[11px] text-muted">
                مشتری: {visit.lead?.name ?? '—'} • {dateLabel(visit.scheduledAt)}
                {visit.offeredPrice != null ? ` • پیشنهاد: ${visit.offeredPrice.toLocaleString('fa-IR')} تومان` : ''}
              </p>
              {visit.feedback ? <p className="mt-1 text-xs text-muted">{visit.feedback}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', visit.status === 'DONE' ? 'bg-emerald-50 text-emerald-700' : visit.status === 'SCHEDULED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                {STATUS_LABELS[visit.status] ?? visit.status}
              </span>
              <select className={field} value={visit.status} onChange={(e) => void setStatus(visit, e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </article>
        ))}
        {visits.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted">بازدیدی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
