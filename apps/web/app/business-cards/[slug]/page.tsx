import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicBusinessCardView } from '@/components/businesscard/PublicBusinessCardView';
import { RecordView } from '@/components/ui/RecordView';
import { absoluteUrl, metaDescription, SERVER_API_URL } from '@/lib/site';
import { type BusinessCard } from '@/lib/api';

interface BusinessCardPayload {
  businessCard: BusinessCard;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

async function getBusinessCard(slug: string): Promise<BusinessCardPayload | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/business-cards/public/${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { data: BusinessCardPayload };
    return payload.data;
  } catch {
    return null;
  }
}

/**
 * Server-rendered SEO metadata for a business-card page: keyword-bearing title,
 * description, canonical URL and Open Graph. Falls back to a generic title only
 * when the card cannot be fetched (the page itself calls `notFound()` then).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBusinessCard(slug);
  if (!data) {
    return { title: 'کارت ویزیت پیدا نشد', robots: { index: false, follow: false } };
  }

  const { businessCard } = data;
  const city = businessCard.city?.name;
  const titleParts = [
    `کارت ویزیت ${businessCard.fullName}`,
    businessCard.jobTitle,
    city ? `در ${city}` : null,
  ].filter(Boolean);
  const title = titleParts.join(' — ');
  const description = metaDescription(
    businessCard.bio,
    `اطلاعات تماس، خدمات و راه‌های ارتباطی ${businessCard.fullName}${
      businessCard.jobTitle ? ` (${businessCard.jobTitle})` : ''
    } در آلوشمال.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/business-cards/${businessCard.slug}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/business-cards/${businessCard.slug}`,
      images: businessCard.avatarUrl ? [absoluteUrl(businessCard.avatarUrl)] : undefined,
    },
  };
}

/** JSON-LD builder: LocalBusiness when a company is set, else ProfilePage. */
function buildJsonLd(data: BusinessCardPayload): Record<string, unknown> {
  const { businessCard } = data;
  const url = absoluteUrl(`/business-cards/${businessCard.slug}`);
  const address = businessCard.address
    ? {
        '@type': 'PostalAddress',
        streetAddress: businessCard.address,
        ...(businessCard.city?.name ? { addressLocality: businessCard.city.name } : {}),
        addressCountry: 'IR',
      }
    : undefined;

  if (businessCard.company) {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: businessCard.company,
      description: businessCard.bio ?? undefined,
      image: businessCard.avatarUrl ?? undefined,
      url,
      ...(businessCard.phone ? { telephone: businessCard.phone } : {}),
      ...(address ? { address } : {}),
      employee: {
        '@type': 'Person',
        name: businessCard.fullName,
        ...(businessCard.jobTitle ? { jobTitle: businessCard.jobTitle } : {}),
      },
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: businessCard.publishedAt ?? undefined,
    mainEntity: {
      '@type': 'Person',
      name: businessCard.fullName,
      ...(businessCard.jobTitle ? { jobTitle: businessCard.jobTitle } : {}),
      description: businessCard.bio ?? undefined,
      image: businessCard.avatarUrl ?? undefined,
      url,
      ...(address ? { address } : {}),
    },
  };
}

export default async function PublicBusinessCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getBusinessCard(slug);
  if (!data) {
    notFound();
  }
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD for rich results; must live in the server HTML (see SEO guide).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(data)) }}
      />
      <RecordView kind="business-cards" slug={slug} />
      <PublicBusinessCardView
        businessCard={data.businessCard}
        qr={data.qr}
        link={data.link}
        like={data.like}
      />
    </>
  );
}
