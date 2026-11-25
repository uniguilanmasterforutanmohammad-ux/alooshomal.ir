import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { StayBookingForm } from '@/components/stay/StayBookingForm';
import { StayReviews } from '@/components/stay/StayReviews';
import { JsonLd } from '@/components/seo/JsonLd';
import type { AccommodationProperty } from '@/lib/api';
import {
  absoluteUrl,
  SERVER_API_URL,
  decodeSlugParam,
  metaDescription,
} from '@/lib/site';
import { breadcrumbJsonLd } from '@/lib/seo';

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

  const url = absoluteUrl(`/stay/${stay.slug}`);
  // Prices are stored in Toman (`IRT`); schema.org expects the ISO 4217 Rial
  // code, so convert (1 Toman = 10 Rial) instead of mislabelling the unit.
  const priceInRial = stay.currency === 'IRT' ? stay.basePrice * 10 : stay.basePrice;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LodgingBusiness',
        '@id': url,
        name: stay.title,
        description: stay.description ?? undefined,
        url,
        inLanguage: 'fa-IR',
        image: stay.photos.map((photo) => photo.url),
        ...(stay.city?.name || stay.address
          ? {
              address: {
                '@type': 'PostalAddress',
                ...(stay.address ? { streetAddress: stay.address } : {}),
                ...(stay.city?.name ? { addressLocality: stay.city.name } : {}),
                addressCountry: 'IR',
              },
            }
          : {}),
        ...(stay.latitude != null && stay.longitude != null
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: stay.latitude,
                longitude: stay.longitude,
              },
            }
          : {}),
        amenityFeature: stay.amenities.map((name) => ({
          '@type': 'LocationFeatureSpecification',
          name,
          value: true,
        })),
        ...(stay.basePrice > 0
          ? {
              makesOffer: {
                '@type': 'Offer',
                price: priceInRial,
                priceCurrency: 'IRR',
                availability: 'https://schema.org/InStock',
                url,
              },
            }
          : {}),
      },
      breadcrumbJsonLd([
        { name: 'خانه', path: '/' },
        { name: 'اقامتگاه‌ها', path: '/stay' },
        { name: stay.title },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="container-page grid gap-6 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-ink">{stay.title}</h1>
              {stay.rating != null ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                  ★ {stay.rating.toLocaleString('fa-IR')}
                  {stay.reviewsCount
                    ? ` (${stay.reviewsCount.toLocaleString('fa-IR')} دیدگاه)`
                    : ''}
                </span>
              ) : null}
              {stay.instantBooking ? (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                  رزرو آنی
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">
              {stay.city?.name ?? stay.address ?? 'موقعیت نامشخص'} • {stay.maxGuests} مهمان •{' '}
              {stay.bedrooms} اتاق خواب • {stay.beds} تخت
              {stay.areaSize ? ` • ${stay.areaSize} متر` : ''}
            </p>
          </div>

          {stay.photos.length ? (
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stay.photos[0].url}
                alt={stay.photos[0].caption ?? stay.title}
                className="h-72 w-full rounded-lg object-cover"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                {stay.photos.slice(1, 3).map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.caption ?? stay.title}
                    className="h-[8.5rem] w-full rounded-lg object-cover"
                  />
                ))}
              </div>
              {stay.photos.length > 3 ? (
                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  {stay.photos.slice(3, 6).map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.caption ?? stay.title}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : null}
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

          {stay.rules.length ? (
            <section className="indeed-panel p-5">
              <h2 className="mb-3 text-lg font-extrabold text-ink">قوانین اقامتگاه</h2>
              <ul className="list-inside list-disc space-y-1 text-sm leading-7 text-muted">
                {stay.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <StayReviews
            slug={stay.slug}
            initial={stay.reviews ?? []}
            reviewsCount={stay.reviewsCount}
          />

          {stay.externalUrl ? (
            <p className="text-xs text-muted">
              منبع این آگهی:{' '}
              <a
                href={stay.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-brand underline"
              >
                {stay.externalSource === 'JABAMA' ? 'جاباما' : stay.externalSource}
              </a>
            </p>
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
            {stay.depositAmount > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
                ودیعه‌ی رزرو: {stay.depositAmount.toLocaleString('fa-IR')} تومان
                (پرداخت آنلاین هنگام ثبت درخواست)
              </p>
            ) : null}
            <div className="mt-4">
              <StayBookingForm
                slug={stay.slug}
                publicSlug={stay.workspace?.publicSlug ?? null}
                basePrice={stay.basePrice}
                minNights={stay.minNights}
                instantBooking={stay.instantBooking}
              />
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
