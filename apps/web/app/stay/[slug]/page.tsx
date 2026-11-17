import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { StayBookingForm } from '@/components/stay/StayBookingForm';
import type { AccommodationProperty } from '@/lib/api';
import { SERVER_API_URL, decodeSlugParam, metaDescription } from '@/lib/site';

async function fetchStay(slug: string): Promise<AccommodationProperty | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/accommodations/${encodeURIComponent(decodeSlugParam(slug))}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: AccommodationProperty };
    return payload.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stay = await fetchStay(slug);
  if (!stay) {
    return { title: 'اقامتگاه پیدا نشد', robots: { index: false, follow: false } };
  }
  return {
    title: stay.title,
    description: metaDescription(
      stay.description,
      `اجاره‌ی روزانه ${stay.title}${stay.city ? ` در ${stay.city.name}` : ''} — درخواست رزرو مستقیم.`,
    ),
    alternates: { canonical: `/stay/${stay.slug}` },
  };
}

export default async function StayDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stay = await fetchStay(slug);
  if (!stay) notFound();

  return (
    <>
      <Header />
      <main className="container-page grid gap-6 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">{stay.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {stay.city?.name ?? stay.address ?? 'موقعیت نامشخص'} • {stay.maxGuests} مهمان •{' '}
              {stay.bedrooms} اتاق خواب • {stay.beds} تخت
            </p>
          </div>

          {stay.photos.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {stay.photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption ?? stay.title}
                  className="h-56 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}

          {stay.description ? (
            <section className="indeed-panel p-5">
              <h2 className="mb-2 text-lg font-extrabold text-ink">درباره‌ی اقامتگاه</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-muted">{stay.description}</p>
            </section>
          ) : null}

          {stay.amenities.length ? (
            <section className="indeed-panel p-5">
              <h2 className="mb-3 text-lg font-extrabold text-ink">امکانات</h2>
              <div className="flex flex-wrap gap-2">
                {stay.amenities.map((amenity) => (
                  <span key={amenity} className="rounded-full bg-[var(--vintage-paper)] px-3 py-1 text-xs text-muted">
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {stay.workspace?.channels?.length ? (
            <section className="indeed-panel p-5">
              <h2 className="mb-3 text-lg font-extrabold text-ink">رزرو از کانال‌های دیگر</h2>
              <div className="flex flex-wrap gap-2">
                {stay.workspace.channels.map((channel) => (
                  <a
                    key={channel.id}
                    href={channel.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border px-3 py-2 text-xs font-bold text-brand hover:bg-brand-light"
                  >
                    {channel.name}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="indeed-panel p-5">
            <p className="text-lg font-extrabold text-brand">
              {stay.basePrice.toLocaleString('fa-IR')} تومان / شب
            </p>
            <p className="mt-1 text-xs text-muted">
              حداقل {stay.minNights} شب
              {stay.checkInTime ? ` • ورود ${stay.checkInTime}` : ''}
              {stay.checkOutTime ? ` • خروج ${stay.checkOutTime}` : ''}
            </p>
            <div className="mt-4">
              <StayBookingForm slug={stay.slug} />
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
