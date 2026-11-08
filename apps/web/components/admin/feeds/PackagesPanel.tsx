'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedPackage } from '@/lib/api';

export function PackagesPanel() {
  const [packages, setPackages] = useState<FeedPackage[]>([]);
  const [form, setForm] = useState({ id: '', name: '', postsQuota: '', durationDays: '30' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPackages(await api.get<FeedPackage[]>('/admin/feeds/packages'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const postsQuota = Number(form.postsQuota);
    const durationDays = Number(form.durationDays);
    if (!form.name.trim() || !Number.isInteger(postsQuota) || postsQuota < 1) {
      setError('نام و تعداد پست الزامی است');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { name: form.name.trim(), postsQuota, durationDays };
      if (form.id) {
        await api.patch(`/admin/feeds/packages/${form.id}`, payload);
      } else {
        await api.post('/admin/feeds/packages', payload);
      }
      setForm({ id: '', name: '', postsQuota: '', durationDays: '30' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این بسته حذف شود؟')) return;
    try {
      await api.delete(`/admin/feeds/packages/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <form onSubmit={save} className="indeed-panel flex flex-wrap items-end gap-3 p-5">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          نام بسته
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          تعداد پست
          <input
            type="number"
            min={1}
            dir="ltr"
            value={form.postsQuota}
            onChange={(event) => setForm({ ...form, postsQuota: event.target.value })}
            className="w-28 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          مدت (روز)
          <input
            type="number"
            min={1}
            dir="ltr"
            value={form.durationDays}
            onChange={(event) => setForm({ ...form, durationDays: event.target.value })}
            className="w-28 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden />
          {form.id ? 'ویرایش' : 'افزودن'}
        </button>
      </form>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <h4 className="font-extrabold text-ink">{pkg.name}</h4>
                <p className="text-xs text-muted">
                  {pkg.postsQuota.toLocaleString('fa-IR')} پست •{' '}
                  {pkg.durationDays.toLocaleString('fa-IR')} روز
                  {pkg.isActive ? '' : ' • غیرفعال'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setForm({
                      id: pkg.id,
                      name: pkg.name,
                      postsQuota: String(pkg.postsQuota),
                      durationDays: String(pkg.durationDays),
                    })
                  }
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  ویرایش
                </button>
                <button
                  onClick={() => remove(pkg.id)}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600"
                >
                  <Trash2 className="size-4" aria-hidden />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
