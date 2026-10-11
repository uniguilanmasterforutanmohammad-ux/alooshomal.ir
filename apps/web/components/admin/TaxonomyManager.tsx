'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Power, Trash2 } from 'lucide-react';

import { api, type TaxonomyItem } from '@/lib/api';

interface Props {
  title: string;
  description: string;
  endpoint: string;
  placeholder: string;
}

export function TaxonomyManager({ title, description, endpoint, placeholder }: Props) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<TaxonomyItem[]>(endpoint);
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(endpoint, { name: name.trim() });
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'افزودن ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: TaxonomyItem) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`${endpoint}/${item.id}`, { isActive: !item.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: TaxonomyItem) {
    if (!window.confirm(`حذف «${item.name}»؟`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`${endpoint}/${item.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-ink">{title}</h3>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand">
          {items.length.toLocaleString('fa-IR')}
        </span>
      </div>

      <form onSubmit={addItem} className="mt-4 flex gap-2">
        <input
          className="indeed-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          maxLength={80}
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="indeed-btn indeed-btn-primary shrink-0 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          افزودن
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">هنوز موردی ثبت نشده است.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--indeed-border)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
              <span className="text-sm text-ink">
                {item.name}
                {!item.isActive ? (
                  <span className="ms-2 text-xs text-muted">(غیرفعال)</span>
                ) : null}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  disabled={busy}
                  title={item.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  className={
                    item.isActive
                      ? 'flex size-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50'
                      : 'flex size-8 items-center justify-center rounded-md text-muted hover:bg-soft'
                  }
                >
                  <Power className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  disabled={busy}
                  title="حذف"
                  className="flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
