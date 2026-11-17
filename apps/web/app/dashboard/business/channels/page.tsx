'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type AccommodationChannel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

const KINDS = [
  { value: 'OTA', label: 'پلتفرم رزرو (OTA)' },
  { value: 'DIRECT', label: 'سایت/رزرو مستقیم' },
  { value: 'SOCIAL', label: 'شبکه‌ی اجتماعی' },
  { value: 'OTHER', label: 'سایر' },
];

export default function ChannelsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<AccommodationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    kind: 'OTA',
    url: '',
    accountRef: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<AccommodationChannel[]>('/accommodation-channels'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/channels');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/accommodation-channels', {
        ...form,
        name: form.name.trim(),
        url: form.url.trim() || undefined,
        accountRef: form.accountRef.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({ name: '', kind: 'OTA', url: '', accountRef: '', notes: '' });
      await load();
      toast.success('کانال رزرو اضافه شد');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(item: AccommodationChannel) {
    await api.patch(`/accommodation-channels/${item.id}`, { isActive: !item.isActive });
    await load();
  }

  async function remove(item: AccommodationChannel) {
    if (!window.confirm(`کانال «${item.name}» حذف شود؟`)) return;
    await api.delete(`/accommodation-channels/${item.id}`);
    await load();
  }

  const field =
    'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">کانال‌های رزرو</h1>
        <p className="mt-1 text-sm text-muted">
          پلتفرم‌ها و حساب‌هایی که اقامتگاه را در آن‌ها ثبت کرده‌اید؛ این فهرست در
          صفحه‌ی عمومی اقامتگاه هم نمایش داده می‌شود.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={create} className="indeed-panel grid gap-3 p-5 md:grid-cols-2">
        <input
          className={field}
          placeholder="نام کانال (مثلاً جاباما)"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <select
          className={field}
          value={form.kind}
          onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}
        >
          {KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
        <input
          className={field}
          placeholder="لینک صفحه (اختیاری)"
          value={form.url}
          onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
        />
        <input
          className={field}
          placeholder="شناسه/نام حساب در پلتفرم"
          value={form.accountRef}
          onChange={(event) => setForm((prev) => ({ ...prev, accountRef: event.target.value }))}
        />
        <input
          className={`${field} md:col-span-2`}
          placeholder="یادداشت داخلی (اختیاری)"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
        <button
          type="submit"
          disabled={submitting}
          className="indeed-btn indeed-btn-primary justify-self-start"
        >
          <Plus className="size-4" aria-hidden />
          افزودن کانال
        </button>
      </form>

      {loading ? (
        <p className="text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-10 text-center text-sm text-muted">
          هنوز کانالی ثبت نشده است.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="indeed-panel flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-ink">{item.name}</h2>
                  <p className="text-[11px] text-muted">
                    {KINDS.find((kind) => kind.value === item.kind)?.label ?? item.kind}
                    {item.accountRef ? ` • ${item.accountRef}` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              {item.notes ? <p className="text-xs text-muted">{item.notes}</p> : null}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand"
                    >
                      <ExternalLink className="size-3" aria-hidden />
                      صفحه
                    </a>
                  ) : null}
                  <button type="button" onClick={() => void toggle(item)} className="text-xs font-bold text-muted">
                    {item.isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
                  </button>
                </div>
                <button type="button" onClick={() => void remove(item)} className="text-red-600">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
