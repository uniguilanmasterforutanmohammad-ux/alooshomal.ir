'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BedDouble, MapPin, Plus, Users } from 'lucide-react';

import { AccommodationForm, type AccommodationFormValues } from '@/components/business/AccommodationForm';
import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type AccommodationProperty } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشرشده',
  PAUSED: 'متوقف',
};

export default function AccommodationsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [items, setItems] = useState<AccommodationProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<AccommodationProperty[]>('/accommodations'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری اقامتگاه‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/accommodations');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(values: AccommodationFormValues) {
    setSubmitting(true);
    try {
      await api.post('/accommodations', values);
      toast.success('اقامتگاه ثبت شد');
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">اقامتگاه‌های من</h1>
          <p className="mt-1 text-sm text-muted">
            واحدهای اجاره‌ای خود را ثبت کنید، عکس اضافه کنید و برای رزرو منتشر کنید.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/stay" className="indeed-btn">
            دایرکتوری عمومی
          </Link>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="indeed-btn indeed-btn-primary"
          >
            <Plus className="size-4" aria-hidden />
            {showForm ? 'بستن فرم' : 'اقامتگاه جدید'}
          </button>
        </div>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {showForm ? (
        <section className="indeed-panel p-5">
          <h2 className="mb-4 text-lg font-extrabold text-ink">ثبت اقامتگاه جدید</h2>
          <AccommodationForm
            submitLabel="ثبت اقامتگاه"
            submitting={submitting}
            onSubmit={create}
          />
        </section>
      ) : null}

      {error ? (
        <div className="indeed-panel p-4 text-sm text-red-700">
          {error}
          {error.includes('فعال نیست') ? (
            <Link href="/dashboard/business" className="ms-2 font-bold text-brand underline">
              فعال‌سازی ماژول
            </Link>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <div className="indeed-panel p-10 text-center">
          <p className="text-lg font-bold text-ink">هنوز اقامتگاهی ثبت نکرده‌اید</p>
          <p className="mt-2 text-sm text-muted">
            اولین واحد اجاره‌ای خود را اضافه کنید تا صفحه‌ی عمومی رزرو ساخته شود.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const cover = item.photos.find((photo) => photo.isCover) ?? item.photos[0];
            return (
              <Link
                key={item.id}
                href={`/dashboard/business/accommodations/${item.id}`}
                prefetch={false}
                className="indeed-panel group overflow-hidden transition hover:border-brand/50"
              >
                <div className="relative h-40 bg-[var(--vintage-paper)]">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.url}
                      alt={item.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted">
                      بدون تصویر
                    </div>
                  )}
                  <span className="absolute end-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h3 className="text-sm font-extrabold text-ink">{item.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3" aria-hidden />
                    {item.city?.name ?? item.address ?? 'بدون موقعیت'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" aria-hidden />
                      {item.maxGuests} مهمان
                    </span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="size-3" aria-hidden />
                      {item.bedrooms} اتاق
                    </span>
                    <span>{item._count?.bookings ?? 0} رزرو</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-brand">
                    {item.basePrice.toLocaleString('fa-IR')} تومان / شب
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
