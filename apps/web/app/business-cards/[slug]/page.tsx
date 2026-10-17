import { notFound } from 'next/navigation';

import { PublicBusinessCardView } from '@/components/businesscard/PublicBusinessCardView';
import { RecordView } from '@/components/ui/RecordView';
import { type BusinessCard } from '@/lib/api';

interface BusinessCardPayload {
  businessCard: BusinessCard;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

async function getBusinessCard(slug: string): Promise<BusinessCardPayload | null> {
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/business-cards/public/${slug}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { data: BusinessCardPayload };
    return payload.data;
  } catch {
    return null;
  }
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
