'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, UserRound } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type CrmCustomer, type CrmInteraction } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

export default function CustomersPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<CrmCustomer[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CrmCustomer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', notes: '', tags: '' });
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      setItems(await api.get<CrmCustomer[]>(`/crm/customers${query}`));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/customers');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function openCustomer(id: string) {
    setDetailLoading(true);
    try {
      setSelected(await api.get<CrmCustomer>(`/crm/customers/${id}`));
    } finally {
      setDetailLoading(false);
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim()) return;
    await api.post('/crm/customers', {
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: form.tags
        .split(/[،,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setForm({ fullName: '', phone: '', email: '', notes: '', tags: '' });
    setShowForm(false);
    await load();
    toast.success('مشتری اضافه شد');
  }

  async function addNote() {
    if (!selected || !note.trim()) return;
    await api.post(`/crm/customers/${selected.id}/interactions`, {
      kind: 'NOTE',
      note: note.trim(),
    });
    setNote('');
    await openCustomer(selected.id);
    toast.success('یادداشت ثبت شد');
  }

  const field =
    'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">مدیریت مشتریان</h1>
          <p className="mt-1 text-sm text-muted">
            دفترچه‌ی مشتریان مشترک؛ مشتریان رزروهای عمومی خودکار اینجا ساخته می‌شوند.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="indeed-btn indeed-btn-primary">
          <Plus className="size-4" aria-hidden />
          مشتری جدید
        </button>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {showForm ? (
        <form onSubmit={create} className="indeed-panel grid gap-3 p-5 md:grid-cols-2">
          <input className={field} placeholder="نام و نام خانوادگی" value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} required />
          <input className={field} placeholder="موبایل" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <input className={field} placeholder="ایمیل" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          <input className={field} placeholder="برچسب‌ها (با ویرگول)" value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} />
          <input className={`${field} md:col-span-2`} placeholder="یادداشت" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary justify-self-start">ذخیره مشتری</button>
        </form>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute end-3 top-2.5 size-4 text-muted" aria-hidden />
          <input className={field} placeholder="جستجوی نام، موبایل یا ایمیل…" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="text-muted">در حال بارگذاری…</p>
          ) : items.length === 0 ? (
            <div className="indeed-panel p-8 text-center text-sm text-muted">مشتری‌ای پیدا نشد.</div>
          ) : (
            items.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => void openCustomer(customer.id)}
                className={`indeed-panel flex items-center justify-between gap-3 p-3 text-start transition hover:border-brand/50 ${
                  selected?.id === customer.id ? 'border-brand' : ''
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="vintage-avatar flex size-9 items-center justify-center">
                    <UserRound className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-ink">{customer.fullName}</span>
                    <span className="block text-[11px] text-muted">
                      {customer.phone ?? customer.email ?? 'بدون تماس'}
                    </span>
                  </span>
                </span>
                <span className="text-[11px] text-muted">
                  {customer._count?.bookings ?? 0} رزرو
                </span>
              </button>
            ))
          )}
        </div>

        <div className="indeed-panel p-4">
          {detailLoading ? (
            <p className="text-sm text-muted">در حال بارگذاری…</p>
          ) : !selected ? (
            <p className="text-sm text-muted">یک مشتری را انتخاب کنید تا جزئیات و تاریخچه را ببینید.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{selected.fullName}</h2>
                <p className="text-xs text-muted">
                  {selected.phone ?? '—'} {selected.email ? `• ${selected.email}` : ''}
                </p>
                {selected.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--vintage-paper)] px-2 py-0.5 text-[10px] text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {selected.notes ? <p className="rounded-lg bg-[var(--vintage-paper)] p-2 text-xs text-muted">{selected.notes}</p> : null}
              <div className="flex gap-2">
                <input className={field} placeholder="یادداشت/خلاصه‌ی تماس…" value={note} onChange={(event) => setNote(event.target.value)} />
                <button type="button" onClick={() => void addNote()} className="indeed-btn indeed-btn-primary shrink-0">ثبت</button>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold text-muted">تاریخچه</h3>
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                  {(selected.interactions ?? []).map((interaction: CrmInteraction) => (
                    <div key={interaction.id} className="rounded-lg border px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-ink">{interaction.kind}</span>
                        <span className="text-muted">
                          {new Date(interaction.occurredAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                      {interaction.note ? <p className="mt-1 text-muted">{interaction.note}</p> : null}
                    </div>
                  ))}
                  {(selected.interactions ?? []).length === 0 ? (
                    <p className="text-xs text-muted">تعاملی ثبت نشده است.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
