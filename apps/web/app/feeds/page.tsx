'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FeedCard } from '@/components/feed/FeedCard';
import { Pagination } from '@/components/ui/Pagination';
import type { FeedPost, FeedTopic } from '@/lib/api';
import {
  useDirectoryDisplayMode,
  useDirectoryResults,
  useInfiniteScroll,
} from '@/lib/directory';
import { cn } from '@/lib/utils';

interface FeedFilters {
  q: string;
  topicId: string;
}

function Filters({
  value,
  topics,
  onChange,
}: {
  value: FeedFilters;
  topics: FeedTopic[];
  onChange: (next: FeedFilters) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-[var(--indeed-border)] bg-white p-2 shadow-sm sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft);
      }}
    >
      <div className="relative flex flex-1 items-center">
        <Search className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
        <input
          className="h-11 w-full rounded-md bg-transparent px-4 pe-10 text-sm outline-none"
          placeholder="جستجو در متن پست‌ها"
          value={draft.q}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
        />
      </div>
      <div className="relative flex items-center">
        <SlidersHorizontal
          className="pointer-events-none absolute end-3 size-4 text-muted"
          aria-hidden
        />
        <select
          className="h-11 w-full appearance-none rounded-md bg-transparent px-3 pe-9 text-sm outline-none sm:w-56"
          value={draft.topicId}
          onChange={(event) => setDraft({ ...draft, topicId: event.target.value })}
        >
          <option value="">همه موضوع‌ها</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="h-11 rounded-md bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-hover"
      >
        جستجو
      </button>
    </form>
  );
}

function FeedsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FeedFilters>({
    q: searchParams.get('q') ?? '',
    topicId: searchParams.get('topicId') ?? '',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.topicId) params.set('topicId', filters.topicId);
    return params.toString();
  }, [filters.q, filters.topicId]);

  const displayMode = useDirectoryDisplayMode();
  const { items, meta, filters: facets, loading, error, page, setPage, loadMore } =
    useDirectoryResults<FeedPost, { topics: FeedTopic[] }>({
      path: '/feeds/public',
      query: queryString,
      mode: displayMode,
      initialPage: Number(searchParams.get('page') ?? 1) || 1,
      initialFacets: { topics: [] },
    });

  const sentinelRef = useInfiniteScroll(
    displayMode === 'INFINITE',
    loading,
    loadMore,
  );

  // Keep the URL shareable as the visitor types/pages.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.topicId) params.set('topicId', filters.topicId);
    if (displayMode === 'PAGINATION' && page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `/feeds?${query}` : '/feeds', { scroll: false });
  }, [filters, page, displayMode, router]);

  return (
    <>
      <Header />
      <main className="container-page py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="vintage-avatar flex size-11 items-center justify-center">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-ink">فیدها</h1>
              <p className="text-sm text-muted">پست‌های تصویری کاربران شهر</p>
            </div>
          </div>
          <Link href="/dashboard/feeds" className="indeed-btn indeed-btn-secondary py-2 text-sm">
            ثبت پست و اشتراک فید
          </Link>
        </div>

        <Filters value={filters} topics={facets.topics} onChange={setFilters} />

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : null}

        {loading && items.length === 0 ? (
          <p className="mt-6 text-muted">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <div className="indeed-panel mt-6 p-10 text-center text-muted">
            پستی برای نمایش یافت نشد.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {displayMode === 'INFINITE' ? (
          <>
            <div ref={sentinelRef} className="h-8" />
            {loading && items.length > 0 ? (
              <p className="py-3 text-center text-sm text-muted">در حال بارگذاری بیشتر...</p>
            ) : null}
          </>
        ) : meta ? (
          <div className="mt-6">
            <Pagination meta={meta} onPage={setPage} />
          </div>
        ) : null}
      </main>
      <Footer />
    </>
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
