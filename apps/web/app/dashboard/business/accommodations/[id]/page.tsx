'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CalendarFold, ExternalLink, ImagePlus, Trash2 } from 'lucide-react';

import { AccommodationForm, type AccommodationFormValues } from '@/components/business/AccommodationForm';
import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import {
  api,
  type AccommodationBooking,
  type AccommodationCalendarBlock,
  type AccommodationProperty,
  type AccommodationRate,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { todayIso } from '@/lib/jalali';
import { toast } from '@/lib/toast';

export default function AccommodationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [property, setProperty] = useState<AccommodationProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blockForm, setBlockForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [rates, setRates] = useState<AccommodationRate[]>([]);
  const [rateForm, setRateForm] = useState({
    label: '',
    startDate: '',
    endDate: '',
    dayType: 'ALL',
    price: '',
    minNights: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [item, rateList] = await Promise.all([
        api.get<AccommodationProperty>(`/accommodations/${params.id}`),
        api.get<AccommodationRate[]>(`/accommodations/${params.id}/rates`),
      ]);
      setProperty(item);
      setRates(rateList);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace(`/login?next=/dashboard/business/accommodations/${params.id}`);
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load, params.id]);

  async function save(values: AccommodationFormValues) {
    setSubmitting(true);
    try {
      setProperty(
        await api.patch<AccommodationProperty>(
          `/accommodations/${params.id}`,
          values,
        ),
      );
      toast.success('تغییرات اقامتگاه ذخیره شد');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file || !property) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api.upload<{ url: string }>('/uploads/gallery', form);
      await api.post(`/accommodations/${property.id}/photos`, {
        url: uploaded.url,
        isCover: property.photos.length === 0,
        sortOrder: property.photos.length,
      });
      await load();
      toast.success('تصویر اضافه شد');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (!property) return;
    await api.delete(`/accommodations/${property.id}/photos/${photoId}`);
    await load();
  }

  async function addBlock() {
    if (!property || !blockForm.startDate || !blockForm.endDate) return;
    await api.post(`/accommodations/${property.id}/blocks`, blockForm);
    setBlockForm({ startDate: '', endDate: '', reason: '' });
    await load();
    toast.success('بازه مسدود شد');
  }

  async function removeBlock(blockId: string) {
    if (!property) return;
    await api.delete(`/accommodations/${property.id}/blocks/${blockId}`);
    await load();
  }

  async function addRate() {
    if (!property || !rateForm.startDate || !rateForm.endDate || !rateForm.price) {
      return;
    }
    await api.post(`/accommodations/${property.id}/rates`, {
      label: rateForm.label.trim() || undefined,
      startDate: rateForm.startDate,
      endDate: rateForm.endDate,
      dayType: rateForm.dayType,
      price: Number(rateForm.price),
      minNights: rateForm.minNights ? Number(rateForm.minNights) : undefined,
    });
    setRateForm({ label: '', startDate: '', endDate: '', dayType: 'ALL', price: '', minNights: '' });
    await load();
    toast.success('نرخ اضافه شد');
  }

  async function removeRate(rateId: string) {
    if (!property) return;
    await api.delete(`/accommodations/${property.id}/rates/${rateId}`);
    await load();
  }

  async function setBookingStatus(booking: AccommodationBooking, status: string) {
    await api.patch(`/accommodations/bookings/${booking.id}/status`, { status });
    await load();
    toast.success('وضعیت رزرو به‌روزرسانی شد');
  }

  if (loading && !property) {
    return <p className="text-muted">در حال بارگذاری…</p>;
  }
  if (!property) {
    return (
      <div className="indeed-panel p-6">
        <p className="text-sm text-red-700">اقامتگاه پیدا نشد.</p>
        <Link href="/dashboard/business/accommodations" className="indeed-btn mt-4">
          بازگشت به فهرست
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/dashboard/business/accommodations"
            className="text-xs font-bold text-brand"
          >
            ← بازگشت به اقامتگاه‌ها
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">{property.title}</h1>
          <p className="text-sm text-muted">وضعیت: {property.status}</p>
        </div>
        <Link
          href={`/stay/${encodeURIComponent(property.slug)}`}
          target="_blank"
          className="indeed-btn"
        >
          <ExternalLink className="size-4" aria-hidden />
          مشاهده صفحه‌ی عمومی
        </Link>
        <button
          type="button"
          onClick={() =>
            void api.download(
              `/accommodations/${property.id}/calendar.ics`,
              `${property.slug}.ics`,
            )
          }
          className="indeed-btn"
        >
          <CalendarFold className="size-4" aria-hidden />
          خروجی iCal
        </button>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <section className="indeed-panel p-5">
        <h2 className="mb-4 text-lg font-extrabold text-ink">اطلاعات اقامتگاه</h2>
        <AccommodationForm
          initial={property}
          submitLabel="ذخیره تغییرات"
          submitting={submitting}
          onSubmit={save}
        />
      </section>

      <section className="indeed-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">گالری تصاویر</h2>
          <label className="indeed-btn cursor-pointer">
            <ImagePlus className="size-4" aria-hidden />
            {uploading ? 'در حال آپلود…' : 'افزودن عکس'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(event) => void uploadPhoto(event.target.files?.[0])}
            />
          </label>
        </div>
        {property.photos.length === 0 ? (
          <p className="text-sm text-muted">هنوز عکسی اضافه نشده است.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {property.photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? property.title} className="h-28 w-full object-cover" />
                {photo.isCover ? (
                  <span className="absolute start-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                    کاور
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void removePhoto(photo.id)}
                  className="absolute end-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="حذف تصویر"
                >
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="indeed-panel p-5">
        <h2 className="mb-4 text-lg font-extrabold text-ink">مسدودکردن تاریخ‌ها</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <JalaliDatePicker
            value={blockForm.startDate}
            onChange={(iso) => setBlockForm((prev) => ({ ...prev, startDate: iso }))}
            min={todayIso()}
            aria-label="تاریخ شروع مسدودی"
          />
          <JalaliDatePicker
            value={blockForm.endDate}
            onChange={(iso) => setBlockForm((prev) => ({ ...prev, endDate: iso }))}
            min={blockForm.startDate || todayIso()}
            aria-label="تاریخ پایان مسدودی"
          />
          <input
            value={blockForm.reason}
            onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="دلیل (اختیاری)"
            className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void addBlock()} className="indeed-btn indeed-btn-primary">
            مسدودکردن
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {(property.blocks ?? []).map((block: AccommodationCalendarBlock) => (
            <div key={block.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
              <span>
                {new Date(block.startDate).toLocaleDateString('fa-IR')} تا{' '}
                {new Date(block.endDate).toLocaleDateString('fa-IR')}
                {block.reason ? ` — ${block.reason}` : ''}
              </span>
              <button type="button" onClick={() => void removeBlock(block.id)} className="text-red-600">
                حذف
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="indeed-panel p-5">
        <h2 className="mb-1 text-lg font-extrabold text-ink">نرخ‌های فصلی و آخر هفته</h2>
        <p className="mb-4 text-xs text-muted">
          هر شب از نزدیک‌ترین نرخ منطبق استفاده می‌کند؛ اگر نرخی نباشد قیمت پایه اعمال می‌شود.
        </p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input
            value={rateForm.label}
            onChange={(event) => setRateForm((prev) => ({ ...prev, label: event.target.value }))}
            placeholder="برچسب (اختیاری)"
            className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
          />
          <JalaliDatePicker
            value={rateForm.startDate}
            onChange={(iso) => setRateForm((prev) => ({ ...prev, startDate: iso }))}
            min={todayIso()}
            aria-label="شروع نرخ"
          />
          <JalaliDatePicker
            value={rateForm.endDate}
            onChange={(iso) => setRateForm((prev) => ({ ...prev, endDate: iso }))}
            min={rateForm.startDate || todayIso()}
            aria-label="پایان نرخ"
          />
          <select
            value={rateForm.dayType}
            onChange={(event) => setRateForm((prev) => ({ ...prev, dayType: event.target.value }))}
            className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
          >
            <option value="ALL">همه‌ی روزها</option>
            <option value="WEEKEND">آخر هفته</option>
            <option value="WEEKDAY">روزهای عادی</option>
            <option value="HOLIDAY">تعطیلات</option>
          </select>
          <input
            value={rateForm.price}
            onChange={(event) => setRateForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder="قیمت هر شب (تومان)"
            inputMode="numeric"
            className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void addRate()} className="indeed-btn indeed-btn-primary">
            افزودن نرخ
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {rates.length === 0 ? (
            <p className="text-xs text-muted">هنوز نرخی ثبت نشده است.</p>
          ) : (
            rates.map((rate) => (
              <div key={rate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                <span>
                  {new Date(rate.startDate).toLocaleDateString('fa-IR')} تا{' '}
                  {new Date(rate.endDate).toLocaleDateString('fa-IR')}
                  {' • '}
                  {rate.dayType === 'WEEKEND'
                    ? 'آخر هفته'
                    : rate.dayType === 'WEEKDAY'
                      ? 'روزهای عادی'
                      : rate.dayType === 'HOLIDAY'
                        ? 'تعطیلات'
                        : 'همه‌ی روزها'}
                  {rate.label ? ` • ${rate.label}` : ''}
                  {' • '}
                  <b className="text-ink">{rate.price.toLocaleString('fa-IR')} تومان</b>
                </span>
                <button type="button" onClick={() => void removeRate(rate.id)} className="text-red-600">
                  حذف
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="indeed-panel p-5">
        <h2 className="mb-4 text-lg font-extrabold text-ink">رزروهای این اقامتگاه</h2>
        {(property.bookings ?? []).length === 0 ? (
          <p className="text-sm text-muted">هنوز رزروی ثبت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(property.bookings ?? []).map((booking) => (
              <div key={booking.id} className="rounded-lg border px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-ink">
                    {booking.guestName} — {booking.status}
                  </span>
                  <span className="text-muted">
                    {new Date(booking.checkIn).toLocaleDateString('fa-IR')} تا{' '}
                    {new Date(booking.checkOut).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void setBookingStatus(booking, status)}
                      className="rounded border px-2 py-1 font-bold text-muted hover:border-brand hover:text-brand"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
