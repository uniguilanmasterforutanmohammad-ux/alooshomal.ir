'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type AccommodationBooking } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  CONFIRMED: 'تأییدشده',
  DECLINED: 'ردشده',
  CANCELLED: 'لغوشده',
  COMPLETED: 'انجام‌شده',
};
const STATUSES = ['', 'PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED'];

export default function BookingsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<AccommodationBooking[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      setItems(await api.get<AccommodationBooking[]>(`/accommodations/bookings${query}`));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/bookings');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function changeStatus(booking: AccommodationBooking, next: string) {
    await api.patch(`/accommodations/bookings/${booking.id}/status`, { status: next });
    toast.success('وضعیت رزرو به‌روزرسانی شد');
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">رزروها و تقویم</h1>
        <p className="mt-1 text-sm text-muted">
          درخواست‌های رزرو از صفحه‌ی عمومی و رزروهای دستی را مدیریت کنید.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((item) => (
          <button
            key={item || 'all'}
            type="button"
            onClick={() => setStatus(item)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
              status === item ? 'border-brand bg-brand-light text-brand' : 'text-muted'
            }`}
          >
            {item ? STATUS_LABELS[item] : 'همه'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-10 text-center text-sm text-muted">
          رزروی با این فیلتر پیدا نشد.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((booking) => (
            <article key={booking.id} className="indeed-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-ink">
                    {booking.guestName} — {booking.property?.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {booking.guestPhone}
                    {booking.guestEmail ? ` • ${booking.guestEmail}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(booking.checkIn).toLocaleDateString('fa-IR')} تا{' '}
                    {new Date(booking.checkOut).toLocaleDateString('fa-IR')} •{' '}
                    {booking.guests} مهمان • منبع: {booking.source}
                  </p>
                  {booking.message ? (
                    <p className="mt-2 rounded-lg bg-[var(--vintage-paper)] p-2 text-xs text-muted">
                      {booking.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-[var(--vintage-paper)] px-2 py-1 text-[10px] font-bold text-ink">
                    {STATUS_LABELS[booking.status] ?? booking.status}
                  </span>
                  {booking.totalAmount ? (
                    <span className="text-xs font-bold text-brand">
                      {booking.totalAmount.toLocaleString('fa-IR')} تومان
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED'].map((next) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() => void changeStatus(booking, next)}
                    disabled={booking.status === next}
                    className="rounded-lg border px-2.5 py-1 text-xs font-bold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    {STATUS_LABELS[next]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
