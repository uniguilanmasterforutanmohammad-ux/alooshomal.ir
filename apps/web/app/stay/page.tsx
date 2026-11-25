import type { Metadata } from 'next';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { fetchStayDirectory, fetchStayFacets } from '@/lib/catalog-server';
import { SERVER_API_URL, metaDescription } from '@/lib/site';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'آپارتمان',
  VILLA: 'ویلا',
  SUITE: 'سوئیت',
  HOUSE: 'خانه',
  COTTAGE: 'کلبه',
  OTHER: 'سایر',
};

export const metadata: Metadata = {
  title: 'دایرکتوری اقامتگاه‌های اجاره‌ای',
  description: metaDescription(
    null,
    'دایرکتوری اقامتگاه‌های اجاره‌ای روزانه: ویلا، آپارتمان و سوئیت با جست‌وجو، فیلتر شهر، ظرفیت و بازه‌ی قیمت.',
  ),
  alternates: { canonical: '/stay' },
};

type StaySearchParams = {
  q?: string;
  cityId?: string;
  type?: string;
  guests?: string;
  minPrice?: string;
  maxPrice?: string;
  checkIn?: string;
  checkOut?: string;
  sort?: string;
};

async function fetchActiveCities(): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await fetch(`${SERVER_API_URL}/cities`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data: Array<{ id: string; name: string }> | null;
    };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export default async function StayDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<StaySearchParams>;
}) {
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/stay')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="اقامتگاه‌های اجاره‌ای" />
      </>
    );
  }
  const params = await searchParams;
  const [stays, facets, cities] = await Promise.all([
    fetchStayDirectory(params),
    fetchStayFacets(),
    fetchActiveCities(),
  ]);
  const cityOptions = facets.cities.length ? facets.cities : cities;
  const hasFilter = Boolean(
    params.q ||
      params.cityId ||
      params.type ||
      params.guests ||
      params.minPrice ||
      params.maxPrice ||
      params.checkIn ||
      params.checkOut ||
      params.sort,
  );

  return (
    <>
      <Header />
      <main className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">اقامتگاه‌های اجاره‌ای</h1>
          <p className="mt-1 text-sm text-muted">
            ویلا، آپارتمان و سوئیت‌های روزانه؛ درخواست رزرو مستقیم از مالک.
          </p>
        </div>

        <form
          action="/stay"
          className="indeed-panel mb-6 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            جست‌وجو
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="عنوان، توضیحات یا آدرس…"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            شهر
            <select
              name="cityId"
              defaultValue={params.cityId ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">همه‌ی شهرها</option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            نوع اقامتگاه
            <select
              name="type"
              defaultValue={params.type ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">همه‌ی انواع</option>
              {(facets.types.length
                ? facets.types
                : Object.keys(PROPERTY_TYPE_LABELS)
              ).map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد مهمان
            <input
              type="number"
              name="guests"
              min={1}
              defaultValue={params.guests ?? ''}
              placeholder="مثلاً ۲"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تاریخ ورود
            <input
              type="date"
              name="checkIn"
              defaultValue={params.checkIn ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تاریخ خروج
            <input
              type="date"
              name="checkOut"
              defaultValue={params.checkOut ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            از قیمت (تومان)
            <input
              type="number"
              name="minPrice"
              min={0}
              defaultValue={params.minPrice ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تا قیمت (تومان)
            <input
              type="number"
              name="maxPrice"
              min={0}
              defaultValue={params.maxPrice ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            ترتیب
            <select
              name="sort"
              defaultValue={params.sort ?? 'newest'}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="newest">جدیدترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="indeed-btn indeed-btn-primary flex-1">
              اعمال فیلتر
            </button>
            {hasFilter ? (
              <Link href="/stay" className="indeed-btn shrink-0">
                پاک‌کردن
              </Link>
            ) : null}
          </div>
        </form>

        <p className="mb-3 text-xs text-muted">
          {stays.length.toLocaleString('fa-IR')} اقامتگاه پیدا شد
        </p>

        {stays.length === 0 ? (
          <div className="indeed-panel p-10 text-center text-sm text-muted">
            اقامتگاهی با این فیلترها پیدا نشد.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stays.map((stay) => {
              const cover = stay.photos.find((photo) => photo.isCover) ?? stay.photos[0];
              return (
                <Link
                  key={stay.id}
                  href={`/stay/${encodeURIComponent(stay.slug)}`}
                  className="indeed-panel overflow-hidden transition hover:border-brand/50"
                >
                  <div className="relative h-44 bg-[var(--vintage-paper)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt={stay.title} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted">
                        بدون تصویر
                      </div>
                    )}
                    {stay.rating != null ? (
                      <span className="absolute start-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[11px] font-bold text-white">
                        ★ {stay.rating.toLocaleString('fa-IR')}
                        {stay.reviewsCount
                          ? ` (${stay.reviewsCount.toLocaleString('fa-IR')})`
                          : ''}
                      </span>
                    ) : null}
                    {stay.instantBooking ? (
                      <span className="absolute end-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
                        رزرو آنی
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <h2 className="text-sm font-extrabold text-ink">{stay.title}</h2>
                    <p className="text-xs text-muted">
                      {stay.city?.name ?? stay.address ?? 'موقعیت نامشخص'}
                    </p>
                    <p className="text-xs text-muted">
                      {stay.maxGuests} مهمان • {stay.bedrooms} اتاق خواب
                      {stay.areaSize ? ` • ${stay.areaSize} متر` : ''}
                      {stay.propertyType
                        ? ` • ${PROPERTY_TYPE_LABELS[stay.propertyType] ?? stay.propertyType}`
                        : ''}
                    </p>
                    {stay.amenities.length ? (
                      <p className="line-clamp-1 text-[11px] text-muted">
                        {stay.amenities.slice(0, 4).join(' • ')}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm font-extrabold text-brand">
                      {stay.basePrice.toLocaleString('fa-IR')} تومان / شب
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
