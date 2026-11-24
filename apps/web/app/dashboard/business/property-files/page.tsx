'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type PropertyCooperation,
  type PropertyFile,
  type PropertyLead,
} from '@/lib/api';
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
  const [coops, setCoops] = useState<{ file: PropertyFile; rows: PropertyCooperation[] } | null>(null);
  const [coopForm, setCoopForm] = useState({ partnerName: '', partnerPhone: '', shareType: 'PERCENT', shareValue: '' });

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

  async function publish(file: PropertyFile) {
    const result = await api.post<{ publicToken: string | null }>(`/property-files/${file.id}/publish`);
    await load();
    if (result.publicToken) {
      await copyLink(result.publicToken);
    }
    toast.success('آگهی منتشر شد');
  }

  async function unpublish(file: PropertyFile) {
    await api.post(`/property-files/${file.id}/unpublish`);
    await load();
    toast.success('انتشار آگهی لغو شد');
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('لینک عمومی کپی شد');
    } catch {
      toast.info(url);
    }
  }

  async function openCoops(file: PropertyFile) {
    const rows = await api.get<PropertyCooperation[]>(`/property-cooperations?propertyId=${file.id}`);
    setCoops({ file, rows });
  }

  async function addCoop(event: React.FormEvent) {
    event.preventDefault();
    if (!coops) return;
    await api.post('/property-cooperations', {
      propertyId: coops.file.id,
      partnerName: coopForm.partnerName.trim(),
      partnerPhone: coopForm.partnerPhone.trim() || undefined,
      shareType: coopForm.shareType,
      shareValue: coopForm.shareValue ? Number(coopForm.shareValue) : 0,
    });
    setCoopForm({ partnerName: '', partnerPhone: '', shareType: 'PERCENT', shareValue: '' });
    await openCoops(coops.file);
    toast.success('همکاری ثبت شد');
  }

  async function removeCoop(id: string) {
    if (!coops) return;
    await api.delete(`/property-cooperations/${id}`);
    await openCoops(coops.file);
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

      {coops ? (
        <section className="indeed-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-ink">همکاری روی «{coops.file.title}»</h2>
            <button type="button" className="text-xs text-muted" onClick={() => setCoops(null)}>بستن</button>
          </div>
          <form onSubmit={addCoop} className="mt-2 grid gap-2 md:grid-cols-5">
            <input className={field} placeholder="نام شریک/شعبه" value={coopForm.partnerName} onChange={(e) => setCoopForm((p) => ({ ...p, partnerName: e.target.value }))} required />
            <input className={field} placeholder="تماس" value={coopForm.partnerPhone} onChange={(e) => setCoopForm((p) => ({ ...p, partnerPhone: e.target.value }))} />
            <select className={field} value={coopForm.shareType} onChange={(e) => setCoopForm((p) => ({ ...p, shareType: e.target.value }))}>
              <option value="PERCENT">درصد</option>
              <option value="FIXED">مبلغ ثابت</option>
            </select>
            <input className={field} type="number" placeholder={coopForm.shareType === 'PERCENT' ? 'درصد سهم' : 'مبلغ (تومان)'} value={coopForm.shareValue} onChange={(e) => setCoopForm((p) => ({ ...p, shareValue: e.target.value }))} />
            <button type="submit" className="indeed-btn indeed-btn-primary">ثبت همکاری</button>
          </form>
          <ul className="mt-3 divide-y divide-[var(--vintage-border)] text-xs">
            {coops.rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-ink">{row.partnerName}{row.partnerPhone ? ` • ${row.partnerPhone}` : ''}</span>
                <span className="flex items-center gap-2 text-muted">
                  {row.shareType === 'PERCENT' ? `${row.shareValue}٪` : `${row.shareValue.toLocaleString('fa-IR')} تومان`}
                  <button type="button" onClick={() => void removeCoop(row.id)} className="text-red-600">حذف</button>
                </span>
              </li>
            ))}
            {coops.rows.length === 0 ? <li className="py-2 text-muted">همکاری‌ای ثبت نشده است.</li> : null}
          </ul>
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
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void openCoops(file)}>همکاری</button>
              {file.published && file.publicToken ? (
                <>
                  <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void copyLink(file.publicToken!)}>کپی لینک آگهی</button>
                  <button type="button" className="indeed-btn text-xs text-red-600" onClick={() => void unpublish(file)}>لغو انتشار</button>
                </>
              ) : (
                <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void publish(file)}>انتشار آگهی</button>
              )}
            </div>
            {file.published ? (
              <p className="text-[11px] text-emerald-700">
                منتشرشده • {file.viewCount.toLocaleString('fa-IR')} بازدید • {file.inquiryCount.toLocaleString('fa-IR')} درخواست
              </p>
            ) : null}
          </article>
        ))}
        {files.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted md:col-span-2">فایلی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
