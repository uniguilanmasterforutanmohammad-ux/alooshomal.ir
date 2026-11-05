'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Info, PenLine, Search, X } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedRail } from '@/components/feed/FeedRail';
import { FeedSearch } from '@/components/feed/FeedSearch';
import { FeedSidebar } from '@/components/feed/FeedSidebar';
import type { FeedPost, FeedTopic } from '@/lib/api';
import { useDirectoryResults, useInfiniteScroll } from '@/lib/directory';
import { useFeatures } from '@/lib/features';

interface FeedFilters {
  q: string;
  topicId: string;
}

function FeedsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSectionStopped } = useFeatures();

  const [filters, setFilters] = useState<FeedFilters>({
    q: searchParams.get('q') ?? '',
    topicId: searchParams.get('topicId') ?? '',
  });
  const [searchOpen, setSearchOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.topicId) params.set('topicId', filters.topicId);
    return params.toString();
  }, [filters.q, filters.topicId]);

  // The stream keeps the existing infinite-scroll machinery. Unlike the older
  // fixed-shell layout, this Twitter-style page scrolls with the window so the
  // sticky timeline header behaves like a social feed.
  const { items, meta, filters: facets, loading, error, loadMore } =
    useDirectoryResults<FeedPost, { topics: FeedTopic[] }>({
      path: '/feeds/public',
      query: queryString,
      mode: 'INFINITE',
      initialFacets: { topics: [] },
    });

  const sentinelRef = useInfiniteScroll(true, loading, loadMore);

  // Keep the URL shareable as the visitor filters.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.topicId) params.set('topicId', filters.topicId);
    const query = params.toString();
    router.replace(query ? `/feeds?${query}` : '/feeds', { scroll: false });
  }, [filters, router]);

  if (isSectionStopped('/feeds')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="پست‌های کاربران" />
      </>
    );
  }

  const setQuery = (q: string) => setFilters((prev) => ({ ...prev, q }));
  const setTopic = (topicId: string) =>
    setFilters((prev) => ({ ...prev, topicId }));

  return (
    <div className="tw-page">
      <div className="tw-layout">
        <FeedRail />

        <main className="tw-main">
          {/* Sticky timeline header: title, mobile search toggle and topic chips. */}
          <header className="tw-header">
            <div className="tw-header-row">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-extrabold text-ink">
                  پست‌های کاربران
                </h1>
                <p className="truncate text-[11px] text-muted">
                  {meta
                    ? `${meta.total.toLocaleString('fa-IR')} پست منتشرشده`
                    : 'جریانی از یادداشت‌های کاربران شهر'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen((open) => !open)}
                className="tw-icon-btn lg:hidden"
                aria-label={searchOpen ? 'بستن جستجو' : 'جستجو'}
                aria-expanded={searchOpen}
              >
                {searchOpen ? (
                  <X className="size-5" aria-hidden />
                ) : (
                  <Search className="size-5" aria-hidden />
                )}
              </button>
              <Link
                href="/dashboard/feeds"
                className="indeed-btn indeed-btn-primary hidden rounded-full px-4 py-2 text-sm sm:inline-flex"
              >
                <PenLine className="size-4" aria-hidden />
                ثبت پست
              </Link>
            </div>

            {searchOpen ? (
              <div className="px-4 pb-3 lg:hidden">
                <FeedSearch value={filters.q} onSubmit={setQuery} autoFocus />
              </div>
            ) : null}

            <div className="tw-topic-row" role="group" aria-label="فیلتر موضوع">
              <button
                type="button"
                aria-pressed={!filters.topicId}
                data-active={!filters.topicId}
                className="tw-topic-chip"
                onClick={() => setTopic('')}
              >
                برای شما
              </button>
              {facets.topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={filters.topicId === topic.id}
                  data-active={filters.topicId === topic.id}
                  className="tw-topic-chip"
                  onClick={() => setTopic(topic.id)}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </header>

          {/* Composer prompt, like the «چه خبر؟» box at the top of a timeline. */}
          <div className="tw-composer">
            <span className="tw-avatar tw-avatar-sm tw-avatar-me" aria-hidden>
              <PenLine className="size-5" />
            </span>
            <Link href="/dashboard/feeds" className="tw-composer-prompt">
              چی توی ذهنته؟ پستی بنویس…
            </Link>
            <Link
              href="/dashboard/feeds"
              className="indeed-btn indeed-btn-primary hidden rounded-full px-5 py-2 text-sm sm:inline-flex"
            >
              ثبت پست
            </Link>
          </div>

          {error ? (
            <p className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div>
            {loading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="tw-post">
                  <div className="tw-avatar animate-pulse bg-soft" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-1/3 animate-pulse rounded-full bg-soft" />
                    <div className="h-3 w-full animate-pulse rounded-full bg-soft" />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-soft" />
                  </div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-bold text-ink">پستی برای نمایش یافت نشد</p>
                <p className="mt-2 text-sm text-muted">
                  عبارت جستجو یا موضوع را تغییر دهید.
                </p>
              </div>
            ) : (
              <>
                {items.map((post) => (
                  <FeedCard key={post.id} post={post} />
                ))}
                <div ref={sentinelRef} className="h-2" aria-hidden />
                {loading ? (
                  <div className="py-4 text-center text-xs text-muted">
                    در حال بارگذاری موارد بیشتر...
                  </div>
                ) : null}
                {!loading && meta && !meta.hasNext ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-center text-xs text-muted">
                    <Info className="size-3.5" aria-hidden />
                    همهٔ پست‌ها نمایش داده شد.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>

        <FeedSidebar
          topics={facets.topics}
          activeTopicId={filters.topicId}
          searchValue={filters.q}
          onSearch={setQuery}
          onSelectTopic={setTopic}
        />
      </div>
    </div>
  );
}

export default function FeedsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">
          در حال بارگذاری...
        </div>
      }
    >
      <FeedsContent />
    </Suspense>
  );
}
