'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedSubscription } from '@/lib/api';

export function SubscriptionsPanel() {
  const [status, setStatus] = useState('PENDING');
  const [subs, setSubs] = useState<FeedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubs(
        await api.get<FeedSubscription[]>(`/admin/feeds/subscriptions?status=${status}`),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'ACTIVE' | 'REJECTED') {
    setBusyId(id);
    try {
      await api.patch(`/admin/feeds/subscriptions/${id}`, { decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تصمیم ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['PENDING', 'در انتظار'],
            ['ACTIVE', 'فعال'],
            ['REJECTED', 'ردشده'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={
              status === value
                ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                : 'indeed-btn indeed-btn-secondary py-2 text-sm'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : subs.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-muted">
          اشتراکی در این وضعیت وجود ندارد.
        </div>
      ) : (
        subs.map((sub) => (
          <div
            key={sub.id}
            className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <h4 className="font-extrabold text-ink">
                {sub.package?.name ?? 'بسته فید'}
              </h4>
              <p dir="ltr" className="text-xs text-muted">
                {sub.user?.email}
              </p>
              <p className="mt-1 text-xs text-muted">
                درخواست: {new Date(sub.requestedAt).toLocaleDateString('fa-IR')}
                {sub.expiresAt
                  ? ` • انقضا: ${new Date(sub.expiresAt).toLocaleDateString('fa-IR')}`
                  : ''}
              </p>
            </div>
            {sub.status === 'PENDING' ? (
              <div className="flex items-center gap-2">
                <button
                  disabled={busyId === sub.id}
                  onClick={() => decide(sub.id, 'ACTIVE')}
                  className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                >
                  <Check className="size-4" aria-hidden />
                  فعال‌سازی
                </button>
                <button
                  disabled={busyId === sub.id}
                  onClick={() => decide(sub.id, 'REJECTED')}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600 disabled:opacity-60"
                >
                  <X className="size-4" aria-hidden />
                  رد
                </button>
              </div>
            ) : (
              <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-muted">
                {sub.status === 'ACTIVE' ? 'فعال' : 'ردشده'}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
