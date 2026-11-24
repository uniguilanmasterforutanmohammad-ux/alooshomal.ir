'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type PropertyContract, type PropertyFile, type PropertyLead } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SIGNED: 'امضاشده',
  SETTLED: 'تسویه‌شده',
  CANCELLED: 'لغوشده',
};

const money = (value: number | null) =>
  value == null ? '—' : `${value.toLocaleString('fa-IR')} تومان`;

const emptyForm = {
  propertyId: '',
  leadId: '',
  kind: 'SALE',
  price: '',
  deposit: '',
  rent: '',
  commissionExpected: '',
  commissionCollected: '',
  officeShare: '',
  agentShare: '',
  referrerName: '',
  referrerShare: '',
};

export default function PropertyContractsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [contracts, setContracts] = useState<PropertyContract[]>([]);
  const [files, setFiles] = useState<PropertyFile[]>([]);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const [c, f, l] = await Promise.all([
      api.get<PropertyContract[]>('/property-contracts'),
      api.get<PropertyFile[]>('/property-files'),
      api.get<PropertyLead[]>('/property-leads'),
    ]);
    setContracts(c);
    setFiles(f);
    setLeads(l);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/property-contracts');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.propertyId) return;
    await api.post('/property-contracts', {
      propertyId: form.propertyId,
      leadId: form.leadId || undefined,
      kind: form.kind,
      price: form.price ? Number(form.price) : undefined,
      deposit: form.deposit ? Number(form.deposit) : undefined,
      rent: form.rent ? Number(form.rent) : undefined,
      commissionExpected: form.commissionExpected ? Number(form.commissionExpected) : undefined,
      commissionCollected: form.commissionCollected ? Number(form.commissionCollected) : undefined,
      officeShare: form.officeShare ? Number(form.officeShare) : undefined,
      agentShare: form.agentShare ? Number(form.agentShare) : undefined,
      referrerName: form.referrerName.trim() || undefined,
      referrerShare: form.referrerShare ? Number(form.referrerShare) : undefined,
    });
    setForm(emptyForm);
    await load();
    toast.success('قرارداد ثبت شد');
  }

  async function setStatus(contract: PropertyContract, status: string) {
    await api.patch(`/property-contracts/${contract.id}`, { status });
    await load();
  }

  async function settle(contract: PropertyContract) {
    await api.patch(`/property-contracts/${contract.id}`, {
      status: 'SETTLED',
      commissionCollected: contract.commissionExpected,
    });
    await load();
    toast.success('تسویه ثبت شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">قرارداد و کمیسیون</h1>
        <p className="mt-1 text-sm text-muted">
          ثبت قرارداد، حق‌الزحمه‌ی مورد انتظار/وصول‌شده و سهم دفتر، مشاور و معرف.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={create} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <select className={field} value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))} required>
          <option value="">انتخاب فایل…</option>
          {files.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}
        </select>
        <select className={field} value={form.leadId} onChange={(e) => setForm((p) => ({ ...p, leadId: e.target.value }))}>
          <option value="">بدون مشتری</option>
          {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
        </select>
        <select className={field} value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
          <option value="SALE">فروش</option>
          <option value="RENT">اجاره</option>
        </select>
        <input className={field} placeholder="کمیسیون مورد انتظار" inputMode="numeric" value={form.commissionExpected} onChange={(e) => setForm((p) => ({ ...p, commissionExpected: e.target.value }))} />
        <input className={field} placeholder="کمیسیون وصول‌شده" inputMode="numeric" value={form.commissionCollected} onChange={(e) => setForm((p) => ({ ...p, commissionCollected: e.target.value }))} />
        <input className={field} placeholder="سهم دفتر" inputMode="numeric" value={form.officeShare} onChange={(e) => setForm((p) => ({ ...p, officeShare: e.target.value }))} />
        <input className={field} placeholder="سهم مشاور" inputMode="numeric" value={form.agentShare} onChange={(e) => setForm((p) => ({ ...p, agentShare: e.target.value }))} />
        <input className={field} placeholder="نام معرف" value={form.referrerName} onChange={(e) => setForm((p) => ({ ...p, referrerName: e.target.value }))} />
        <input className={field} placeholder="سهم معرف" inputMode="numeric" value={form.referrerShare} onChange={(e) => setForm((p) => ({ ...p, referrerShare: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت قرارداد</button>
      </form>

      <div className="flex flex-col gap-2">
        {contracts.map((contract) => (
          <article key={contract.id} className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <h3 className="text-sm font-extrabold text-ink">{contract.property?.title ?? 'فایل حذف‌شده'}</h3>
              <p className="text-[11px] text-muted">
                {contract.kind === 'RENT' ? 'اجاره' : 'فروش'}
                {contract.lead ? ` • ${contract.lead.name}` : ''}
                {` • مورد انتظار: ${money(contract.commissionExpected)}`}
                {` • وصول: ${money(contract.commissionCollected)}`}
              </p>
              <p className="text-[11px] text-muted">
                دفتر {money(contract.officeShare)} • مشاور {money(contract.agentShare)}
                {contract.referrerName ? ` • معرف ${contract.referrerName}: ${money(contract.referrerShare)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', contract.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-700' : contract.status === 'SIGNED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                {STATUS_LABELS[contract.status] ?? contract.status}
              </span>
              <select className={field} value={contract.status} onChange={(e) => void setStatus(contract, e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void settle(contract)}>تسویه کامل</button>
            </div>
          </article>
        ))}
        {contracts.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted">قراردادی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
