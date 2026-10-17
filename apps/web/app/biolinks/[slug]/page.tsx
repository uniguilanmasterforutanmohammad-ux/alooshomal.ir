import { notFound } from 'next/navigation';

import { PublicBiolinkView } from '@/components/biolink/PublicBiolinkView';
import { RecordView } from '@/components/ui/RecordView';
import { type Biolink } from '@/lib/api';

interface BiolinkPayload {
  biolink: Biolink;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

async function getBiolink(slug: string): Promise<BiolinkPayload | null> {
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/biolinks/public/${slug}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { data: BiolinkPayload };
    return payload.data;
  } catch {
    return null;
  }
}

export default async function PublicBiolinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getBiolink(slug);
  if (!data) {
    notFound();
  }
  return (
    <>
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
