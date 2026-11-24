import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { DirectoryBusinessCardContent } from '@/components/businesscard/DirectoryBusinessCardContent';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchBusinessCardsDirectory } from '@/lib/directory-server';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import { collectionJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'کارت ویزیت دیجیتال کسب‌وکارهای شمال — دفترچه تلفن',
  description:
    'فهرست کارت ویزیت دیجیتال کسب‌وکارهای تنکابن، شیرود و رامسر با شماره تماس، آدرس، دسته‌بندی و راه‌های ارتباطی؛ قابل جست‌وجو و مشاهده بدون نصب برنامه.',
  alternates: { canonical: '/business-cards' },
};

/**
 * Server entry: renders the first directory page as real HTML (crawlable links
 * + content) and hands it to the interactive client list, which keeps infinite
 * scroll, filtering and the split detail view.
 *
 * When the admin stops the «کارت‌های ویزیت» section the page renders the
 * «موقتاً متوقف» screen instead of the directory.
 */
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cityId?: string;
    businessId?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/business-cards')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="کارت‌های ویزیت" />
      </>
    );
  }
  const initialData = await fetchBusinessCardsDirectory({
    q: sp.q,
    cityId: sp.cityId,
    businessId: sp.businessId,
    sort: sp.sort,
  });
  const items = initialData?.items ?? [];
  return (
    <>
      {items.length > 0 ? (
        <JsonLd
          data={collectionJsonLd({
            name: 'کارت ویزیت دیجیتال کسب‌وکارهای شمال',
            description:
              'دایرکتوری عمومی کارت ویزیت کسب‌وکارهای تنکابن، شیرود و رامسر.',
            path: '/business-cards',
            total: initialData?.meta.total,
            items: items.map((item) => ({
              name: item.company || item.fullName,
              path: `/business/${item.slug}`,
            })),
          })}
        />
      ) : null}
      <Header />
      <Suspense
        fallback={<div className="container-page py-8 text-muted">در حال بارگذاری...</div>}
      >
        <DirectoryBusinessCardContent initialData={initialData} />
      </Suspense>
      {/* The footer is intentionally omitted on the directory pages so the
          shell can fill the viewport exactly and only the card list scrolls
          (see `.directory-shell` in globals.css). */}
    </>
  );
}
