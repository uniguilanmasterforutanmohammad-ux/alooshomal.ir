'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface NameRequest {
  id: string;
  name: string;
  pendingName: string | null;
  nameRequestedAt: string | null;
  owner: { id: string; fullName: string | null; phone: string | null };
}

export function AdminWorkspaceNameRequests() {
  const [items, setItems] = useState<NameRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await api.get<NameRequest[]>('/admin/business-modules/name-requests'),
      );
    } catch {
      // API client already surfaced the error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    try {
      await api.post(
        `/admin/business-modules/name-requests/${id}/${approve ? 'approve' : 'reject'}`,
      );
      toast.success(approve ? 'تغییر نام تأیید شد' : 'درخواست تغییر نام رد شد');
      await load();
    } catch {
      // handled
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="indeed-panel mt-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-ink">
            درخواست‌های تغییر نام کسب‌وکار
          </h3>
          <p className="mt-0.5 text-xs leading-6 text-muted">
            تغییر نام نمایشی کسب‌وکارها پس از تأیید شما اعمال می‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="indeed-btn py-1.5 text-xs"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          به‌روزرسانی
        </button>
      </div>
      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          در حال بارگذاری…
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          درخواست تغییر نامی در انتظار بررسی نیست.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--vintage-border)] p-3 text-xs"
            >
              <div className="min-w-0">
                <p className="text-ink">
                  <span className="text-muted">نام فعلی: </span>
                  <span className="font-bold">{item.name}</span>
                  <span className="mx-2 text-muted">→</span>
                  <span className="font-bold text-brand">
                    {item.pendingName}
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  مالک: {item.owner.fullName ?? '—'}
                  {item.owner.phone ? ` • ${item.owner.phone}` : ''}
                  {item.nameRequestedAt
                    ? ` • ${new Date(item.nameRequestedAt).toLocaleString('fa-IR')}`
                    : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void decide(item.id, true)}
                  disabled={busy === item.id}
                  className="indeed-btn indeed-btn-primary py-1 text-[11px] disabled:opacity-40"
                >
                  {busy === item.id ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  ) : (
                    <Check className="size-3" aria-hidden />
                  )}
                  تأیید
                </button>
                <button
                  type="button"
                  onClick={() => void decide(item.id, false)}
                  disabled={busy === item.id}
                  className="indeed-btn py-1 text-[11px] text-red-600 disabled:opacity-40"
                >
                  <X className="size-3" aria-hidden />
                  رد
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
