import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { DirectoryBiolinkContent } from '@/components/biolink/DirectoryBiolinkContent';
import { fetchBiolinksDirectory } from '@/lib/directory-server';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

/**
 * Server entry: renders the first directory page as real HTML (crawlable links
 * + content) and hands it to the interactive client list, which keeps infinite
 * scroll, filtering and the split detail view.
 *
 * When the admin stops the «بیولینک‌ها» section (its feature's «نمایش» switch
 * is off) the page renders the «موقتاً متوقف» screen instead of the directory,
 * and the site-wide notice bar warns visitors everywhere.
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
  if (isRouteStopped(stopped, '/biolinks')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="بیولینک‌ها" />
      </>
    );
  }
  const initialData = await fetchBiolinksDirectory({
    q: sp.q,
    cityId: sp.cityId,
    businessId: sp.businessId,
    sort: sp.sort,
  });
  return (
    <>
      <Header />
      <Suspense
        fallback={<div className="container-page py-8 text-muted">در حال بارگذاری...</div>}
      >
        <DirectoryBiolinkContent initialData={initialData} />
      </Suspense>
      {/* The footer is intentionally omitted on the directory pages so the
          shell can fill the viewport exactly and only the card list scrolls
          (see `.directory-shell` in globals.css). */}
    </>
  );
}
