import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import type { AccommodationProperty } from '@/lib/api';
import { SERVER_API_URL } from '@/lib/site';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

async function fetchStays(q?: string): Promise<AccommodationProperty[]> {
  try {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    const response = await fetch(`${SERVER_API_URL}/public/accommodations${query}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: AccommodationProperty[] };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export default async function StayDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
  const stays = await fetchStays(params.q);

  return (
    <>
      <Header />
      <main className="container-page py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">اقامتگاه‌های اجاره‌ای</h1>
            <p className="mt-1 text-sm text-muted">
              ویلا، آپارتمان و سوئیت‌های روزانه؛ درخواست رزرو مستقیم از مالک.
            </p>
          </div>
          <form className="flex gap-2" action="/stay">
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="جستجو…"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
            />
            <button type="submit" className="indeed-btn">جستجو</button>
          </form>
        </div>

        {stays.length === 0 ? (
          <div className="indeed-panel p-10 text-center text-sm text-muted">
            اقامتگاهی برای نمایش پیدا نشد.
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
                  <div className="h-44 bg-[var(--vintage-paper)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt={stay.title} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted">
                        بدون تصویر
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <h2 className="text-sm font-extrabold text-ink">{stay.title}</h2>
                    <p className="text-xs text-muted">
                      {stay.city?.name ?? stay.address ?? 'موقعیت نامشخص'}
                    </p>
                    <p className="text-xs text-muted">
                      {stay.maxGuests} مهمان • {stay.bedrooms} اتاق خواب
                    </p>
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
