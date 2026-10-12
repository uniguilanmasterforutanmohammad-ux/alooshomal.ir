'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, UserCog, X } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProfileRequest {
  id: string;
  changes: { fullName?: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null; role: string };
}

const STATUS_LABEL: Record<ProfileRequest['status'], string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};
const STATUS_BADGE: Record<ProfileRequest['status'], string> = {
  PENDING: 'badge-progress',
  APPROVED: 'badge-open',
  REJECTED: 'badge-closed',
};

/** Admin section: approve or reject user-initiated profile (name) changes. */
export function AdminProfileRequests() {
  const [status, setStatus] = useState<ProfileRequest['status'] | ''>('PENDING');
  const [items, setItems] = useState<ProfileRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : '';
      setItems(await api.get<ProfileRequest[]>(`/admin/profile-requests${qs}`));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    let reason: string | undefined;
    if (decision === 'REJECTED') {
      const input = window.prompt('دلیل رد درخواست تغییر پروفایل:');
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    await api.patch(`/admin/profile-requests/${id}`, { decision, reason });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-extrabold text-ink">درخواست‌های تغییر پروفایل</h3>
      <div className="flex flex-wrap items-center gap-3">
        <span className="vintage-avatar flex size-10 items-center justify-center">
          <UserCog className="size-5" aria-hidden />
        </span>
        <div className="flex flex-wrap gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', ''] as const).map((value) => (
            <button
              key={value || 'all'}
              onClick={() => setStatus(value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-bold transition',
                status === value
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-[var(--vintage-border)] bg-white text-muted',
              )}
            >
              {value ? STATUS_LABEL[value as ProfileRequest['status']] : 'همه'}
            </button>
          ))}
        </div>
      </div>

      <div className="indeed-panel overflow-hidden">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">درخواستی وجود ندارد.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-56 flex-1">
                <p className="font-bold text-ink">
                  {item.user.fullName ?? item.user.email}
                </p>
                <p className="mt-1 text-xs text-muted">
                  نام جدید: <span className="font-bold text-ink">{item.changes.fullName}</span>
                </p>
                {item.reason ? (
                  <p className="mt-1 text-xs text-red-600">دلیل: {item.reason}</p>
                ) : null}
              </div>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[item.status]}`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              {item.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decide(item.id, 'APPROVED')}
                    className="indeed-btn indeed-btn-primary py-1.5 text-xs"
                  >
                    <Check className="size-3.5" aria-hidden />
                    تأیید
                  </button>
                  <button
                    onClick={() => decide(item.id, 'REJECTED')}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    <X className="size-3.5" aria-hidden />
                    رد
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
