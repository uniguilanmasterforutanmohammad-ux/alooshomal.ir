'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';

import { api, type BoostRequest } from '@/lib/api';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'APPROVED', label: 'تأییدشده' },
  { value: 'REJECTED', label: 'ردشده' },
];

export function AdminBoosts() {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState<BoostRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await api.get<BoostRequest[]>(`/admin/boosts?status=${status}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await api.patch(`/admin/boosts/${id}`, { status: decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت تصمیم');
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
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={
              status === filter.value
                ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                : 'indeed-btn indeed-btn-secondary py-2 text-sm'
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : requests.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-muted">
          درخواست پله‌ای در این وضعیت وجود ندارد.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="flex items-center gap-2 font-extrabold text-ink">
                  <Sparkles className="size-4 text-amber-500" aria-hidden />
                  {request.target?.fullName ?? 'مورد نامشخص'}
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    {request.kind === 'BIOLINK' ? 'بیولینک' : 'کارت ویزیت'}
                  </span>
                </p>
                <p dir="ltr" className="text-xs text-muted">
                  {request.user?.email}
                </p>
                {request.note ? (
                  <p className="mt-1 text-xs text-muted">یادداشت کاربر: {request.note}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => decide(request.id, 'APPROVED')}
                  className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                >
                  <Check className="size-4" aria-hidden />
                  تأیید
                </button>
                <button
                  type="button"
                  disabled={busyId === request.id}
                  onClick={() => decide(request.id, 'REJECTED')}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm disabled:opacity-60"
                >
                  <X className="size-4" aria-hidden />
                  رد
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
