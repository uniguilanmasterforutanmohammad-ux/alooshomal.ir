import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { PublicBiolinkView } from '@/components/biolink/PublicBiolinkView';
import { RecordView } from '@/components/ui/RecordView';
import { absoluteUrl, metaDescription, SERVER_API_URL, decodeSlugParam } from '@/lib/site';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import { type Biolink } from '@/lib/api';

interface BiolinkPayload {
  biolink: Biolink;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

async function getBiolink(slug: string): Promise<BiolinkPayload | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/biolinks/public/${encodeURIComponent(decodeSlugParam(slug))}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { data: BiolinkPayload };
    return payload.data;
  } catch {
    return null;
  }
}

/** Server-rendered SEO metadata for a public biolink page. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBiolink(slug);
  if (!data) {
    return { title: 'بیولینک پیدا نشد', robots: { index: false, follow: false } };
  }

  const { biolink } = data;
  const city = biolink.city?.name;
  const titleParts = [
    biolink.fullName,
    biolink.jobTitle,
    city ? `در ${city}` : null,
  ].filter(Boolean);
  const title = titleParts.join(' — ');
  const description = metaDescription(
    biolink.bio,
    `بیولینک و راه‌های ارتباطی ${biolink.fullName}${
      biolink.jobTitle ? ` (${biolink.jobTitle})` : ''
    } در شمالی کارت.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/biolinks/${biolink.slug}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/biolinks/${biolink.slug}`,
      images: biolink.avatarUrl ? [absoluteUrl(biolink.avatarUrl)] : undefined,
    },
  };
}

/** JSON-LD builder: LocalBusiness when a company is set, else ProfilePage. */
function buildJsonLd(data: BiolinkPayload): Record<string, unknown> {
  const { biolink } = data;
  const url = absoluteUrl(`/biolinks/${biolink.slug}`);
  const address = biolink.address
    ? {
        '@type': 'PostalAddress',
        streetAddress: biolink.address,
        ...(biolink.city?.name ? { addressLocality: biolink.city.name } : {}),
        addressCountry: 'IR',
      }
    : undefined;

  if (biolink.company) {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: biolink.company,
      description: biolink.bio ?? undefined,
      image: biolink.avatarUrl ?? undefined,
      url,
      ...(biolink.phone ? { telephone: biolink.phone } : {}),
      ...(address ? { address } : {}),
      employee: {
        '@type': 'Person',
        name: biolink.fullName,
        ...(biolink.jobTitle ? { jobTitle: biolink.jobTitle } : {}),
      },
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: biolink.fullName,
      ...(biolink.jobTitle ? { jobTitle: biolink.jobTitle } : {}),
      description: biolink.bio ?? undefined,
      image: biolink.avatarUrl ?? undefined,
      url,
      ...(address ? { address } : {}),
    },
  };
}

export default async function PublicBiolinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/biolinks')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="بیولینک‌ها" />
      </>
    );
  }
  const data = await getBiolink(slug);
  if (!data) {
    notFound();
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(data)) }}
      />
      <RecordView kind="biolinks" slug={slug} />
      <PublicBiolinkView
        biolink={data.biolink}
        qr={data.qr}
        link={data.link}
        like={data.like}
      />
    </>
  );
}
