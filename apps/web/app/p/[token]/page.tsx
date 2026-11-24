import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PropertyInquiryForm } from '@/components/property/PropertyInquiryForm';
import { JsonLd } from '@/components/seo/JsonLd';
import type { PublicProperty } from '@/lib/api';
import { absoluteUrl, SERVER_API_URL, metaDescription } from '@/lib/site';

const DEAL_LABELS: Record<string, string> = {
  SALE: 'فروش',
  RENT: 'اجاره',
  MORTGAGE: 'رهن',
};

const KIND_LABELS: Record<string, string> = {
  APARTMENT: 'آپارتمان',
  HOUSE: 'خانه',
  VILLA: 'ویلا',
  LAND: 'زمین',
  OFFICE: 'دفتر',
  SHOP: 'مغازه',
};

const money = (value: number | null) =>
  value == null ? null : `${value.toLocaleString('fa-IR')} تومان`;

async function fetchAd(token: string): Promise<PublicProperty | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/properties/${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: PublicProperty };
    return payload.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const ad = await fetchAd(token);
  if (!ad) {
    return { title: 'آگهی پیدا نشد', robots: { index: false, follow: false } };
  }
  const summary = [
    DEAL_LABELS[ad.dealType] ?? ad.dealType,
    KIND_LABELS[ad.propertyKind] ?? ad.propertyKind,
    ad.neighborhood,
    ad.area ? `${ad.area} متر` : null,
  ]
    .filter(Boolean)
    .join(' • ');
  return {
    title: ad.title,
    description: metaDescription(null, `${summary} — ${ad.agency}`),
    alternates: { canonical: `/p/${ad.token}` },
    openGraph: { title: ad.title, description: summary, type: 'website' },
  };
}

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ad = await fetchAd(token);
  if (!ad) notFound();

  const url = absoluteUrl(`/p/${ad.token}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': url,
    url,
    name: ad.title,
    inLanguage: 'fa-IR',
    datePosted: ad.publishedAt ?? undefined,
    provider: { '@type': 'RealEstateAgent', name: ad.agency },
    ...(ad.area ? { floorSize: { '@type': 'QuantitativeValue', value: ad.area, unitCode: 'MTK' } } : {}),
    ...(ad.rooms ? { numberOfRooms: ad.rooms } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: ad.city ?? undefined,
      addressRegion: ad.neighborhood ?? undefined,
      addressCountry: 'IR',
    },
    ...(ad.price
      ? {
          offers: {
            '@type': 'Offer',
            price: ad.price * 10,
            priceCurrency: 'IRR',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };

  return (
    <>
      <Header />
      <JsonLd data={jsonLd} />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-8">
        <header className="indeed-panel p-5">
          <p className="text-xs text-muted">
            {DEAL_LABELS[ad.dealType] ?? ad.dealType} • {KIND_LABELS[ad.propertyKind] ?? ad.propertyKind}
            {ad.neighborhood ? ` • ${ad.neighborhood}` : ''}
            {ad.city ? ` • ${ad.city}` : ''}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">{ad.title}</h1>
          <p className="mt-2 text-sm text-ink">
            {ad.area ? `${ad.area} متر` : ''}
            {ad.rooms ? ` • ${ad.rooms} خواب` : ''}
            {ad.floor ? ` • طبقه ${ad.floor}` : ''}
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            {money(ad.price) ? <div><dt className="text-xs text-muted">قیمت</dt><dd className="font-bold text-ink">{money(ad.price)}</dd></div> : null}
            {money(ad.deposit) ? <div><dt className="text-xs text-muted">رهن</dt><dd className="font-bold text-ink">{money(ad.deposit)}</dd></div> : null}
            {money(ad.rent) ? <div><dt className="text-xs text-muted">اجاره ماهانه</dt><dd className="font-bold text-ink">{money(ad.rent)}</dd></div> : null}
          </dl>
          {ad.features.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1 text-[11px] text-muted">
              {ad.features.map((feature) => (
                <li key={feature} className="rounded-full bg-[var(--vintage-surface)] px-2 py-0.5">{feature}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-muted">ارائه‌شده توسط {ad.agency}</p>
        </header>

        <PropertyInquiryForm token={ad.token ?? token} />
      </main>
      <Footer />
    </>
  );
}
