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
  PENDING: 'در انتظار بررسی',
  ACTIVE: 'فعال',
  NEEDS_CHECK: 'نیازمند استعلام',
  DEALT: 'معامله‌شده',
  ARCHIVED: 'بایگانی',
};

const DEAL_LABELS: Record<string, string> = {
  SALE: 'فروش',
  RENT: 'اجاره',
  MORTGAGE: 'رهن',
};

const money = (value: number | null) =>
  value == null ? '—' : `${value.toLocaleString('fa-IR')} تومان`;

const emptyForm = {
  title: '',
  dealType: 'SALE',
  neighborhood: '',
  area: '',
  price: '',
  deposit: '',
  rent: '',
  ownerName: '',
  ownerPhone: '',
  address: '',
};

export default function PropertyFilesPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [files, setFiles] = useState<PropertyFile[]>([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [matches, setMatches] = useState<{ file: PropertyFile; leads: PropertyLead[] } | null>(null);

  const load = useCallback(async () => {
    const query = status ? `?status=${status}` : '';
    setFiles(await api.get<PropertyFile[]>(`/property-files${query}`));
  }, [status]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/property-files');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    await api.post('/property-files', {
      title: form.title.trim(),
      dealType: form.dealType,
      neighborhood: form.neighborhood.trim() || undefined,
      area: form.area ? Number(form.area) : undefined,
      price: form.price ? Number(form.price) : undefined,
      deposit: form.deposit ? Number(form.deposit) : undefined,
      rent: form.rent ? Number(form.rent) : undefined,
      ownerName: form.ownerName.trim() || undefined,
      ownerPhone: form.ownerPhone.trim() || undefined,
      address: form.address.trim() || undefined,
    });
    setForm(emptyForm);
    await load();
    toast.success('فایل ملکی ثبت شد');
  }

  async function setFileStatus(file: PropertyFile, next: string) {
    await api.patch(`/property-files/${file.id}`, { status: next });
    await load();
  }

  async function verify(file: PropertyFile) {
    await api.patch(`/property-files/${file.id}`, { verify: true });
    await load();
    toast.success('استعلام فایل ثبت شد');
  }

  async function showMatches(file: PropertyFile) {
    const leads = await api.get<PropertyLead[]>(`/property-files/${file.id}/matches`);
    setMatches({ file, leads });
  }

  async function checkDuplicates(file: PropertyFile) {
    if (!file.ownerPhone && !file.address) {
      toast.error('برای بررسی تکراری، شماره مالک یا نشانی لازم است');
      return;
    }
    const params = new URLSearchParams({ excludeId: file.id });
    if (file.ownerPhone) params.set('ownerPhone', file.ownerPhone);
    if (file.address) params.set('address', file.address);
    const rows = await api.get<PropertyFile[]>(`/property-files/duplicates?${params.toString()}`);
    if (rows.length === 0) {
      toast.success('فایل تکراری پیدا نشد');
      return;
    }
    toast.info(`${rows.length} فایل مشابه پیدا شد`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">بانک فایل‌های ملکی</h1>
        <p className="mt-1 text-sm text-muted">
          ثبت فروش/رهن/اجاره، وضعیت فایل، استعلام و تطبیق با تقاضاهای مشتری.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={create} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <input className={`${field} md:col-span-2`} placeholder="عنوان فایل" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <select className={field} value={form.dealType} onChange={(e) => setForm((p) => ({ ...p, dealType: e.target.value }))}>
          {Object.entries(DEAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className={field} placeholder="محله" value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))} />
        <input className={field} placeholder="متراژ" inputMode="numeric" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} />
        <input className={field} placeholder="قیمت فروش" inputMode="numeric" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
        <input className={field} placeholder="رهن" inputMode="numeric" value={form.deposit} onChange={(e) => setForm((p) => ({ ...p, deposit: e.target.value }))} />
        <input className={field} placeholder="اجاره ماهانه" inputMode="numeric" value={form.rent} onChange={(e) => setForm((p) => ({ ...p, rent: e.target.value }))} />
        <input className={field} placeholder="نام مالک" value={form.ownerName} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} />
        <input className={field} placeholder="شماره مالک" value={form.ownerPhone} onChange={(e) => setForm((p) => ({ ...p, ownerPhone: e.target.value }))} />
        <input className={`${field} md:col-span-2`} placeholder="نشانی دقیق (خصوصی)" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت فایل</button>
      </form>

      <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">همه‌ی وضعیت‌ها</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>

      {matches ? (
        <section className="indeed-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-ink">تقاضاهای متناسب با «{matches.file.title}»</h2>
            <button type="button" className="text-xs text-muted" onClick={() => setMatches(null)}>بستن</button>
          </div>
          {matches.leads.length === 0 ? (
            <p className="mt-2 text-xs text-muted">تقاضای فعال متناسبی پیدا نشد.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {matches.leads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between text-xs">
                  <span>{lead.name}{lead.phone ? ` • ${lead.phone}` : ''}</span>
                  <span className="text-muted">{lead.neighborhoods.join('، ') || 'بدون محله'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {files.map((file) => (
          <article key={file.id} className="indeed-panel flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-ink">{file.title}</h3>
                <p className="text-[11px] text-muted">
                  {DEAL_LABELS[file.dealType] ?? file.dealType}
                  {file.neighborhood ? ` • ${file.neighborhood}` : ''}
                  {file.area ? ` • ${file.area} متر` : ''}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', file.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : file.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                {STATUS_LABELS[file.status] ?? file.status}
              </span>
            </div>
            <p className="text-xs text-ink">
              {file.price != null ? `قیمت: ${money(file.price)}` : ''}
              {file.deposit != null ? ` • رهن: ${money(file.deposit)}` : ''}
              {file.rent != null ? ` • اجاره: ${money(file.rent)}` : ''}
            </p>
            {file.ownerPhone ? <p className="text-[11px] text-muted">مالک: {file.ownerName ?? '—'} • {file.ownerPhone}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select className={field} value={file.status} onChange={(e) => void setFileStatus(file, e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void verify(file)}>استعلام</button>
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void showMatches(file)}>تطبیق</button>
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void checkDuplicates(file)}>تکراری؟</button>
            </div>
          </article>
        ))}
        {files.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted md:col-span-2">فایلی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
