'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Info, PenLine, Search, SlidersHorizontal } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { FeedCard } from '@/components/feed/FeedCard';
import type { FeedPost, FeedTopic } from '@/lib/api';
import { useDirectoryResults, useInfiniteScroll } from '@/lib/directory';

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
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft);
      }}
    >
      <div className="relative flex flex-1 items-center rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm">
        <Search className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
        <input
          className="h-11 w-full bg-transparent px-4 pe-10 text-sm outline-none"
          placeholder="جستجو در متن پست‌ها"
          value={draft.q}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
        />
      </div>
      <div className="relative flex items-center rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm sm:w-56">
        <SlidersHorizontal
          className="pointer-events-none absolute end-3 size-4 text-muted"
          aria-hidden
        />
        <select
          className="h-11 w-full appearance-none bg-transparent px-3 pe-9 text-sm outline-none"
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
      <button type="submit" className="indeed-btn indeed-btn-primary h-11 px-6">
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

  // The feed stream uses the same infinite-scroll machinery as the other public
  // directories: the page chrome stays fixed and only the post list scrolls.
  const { items, meta, filters: facets, loading, error, loadMore } =
    useDirectoryResults<FeedPost, { topics: FeedTopic[] }>({
      path: '/feeds/public',
      query: queryString,
      mode: 'INFINITE',
      initialFacets: { topics: [] },
    });

  const sentinelRef = useInfiniteScroll(true, loading, loadMore);

  // Keep the URL shareable as the visitor types/filters.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.topicId) params.set('topicId', filters.topicId);
    const query = params.toString();
    router.replace(query ? `/feeds?${query}` : '/feeds', { scroll: false });
  }, [filters, router]);

  return (
    <>
      <Header />
      {/* Fixed shell: heading + filters stay put and only the post list below
          scrolls (see `.directory-shell` in globals.css). The footer is
          intentionally omitted so the shell fills the viewport exactly — this
          page is meant to be read as an endless stream. */}
      <main className="container-page py-5 directory-shell">
        <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
              <PenLine className="size-5 text-brand" aria-hidden />
              پست‌های کاربران
            </h1>
            <p className="text-sm text-muted">
              {meta
                ? `${meta.total.toLocaleString('fa-IR')} پست منتشرشده`
                : 'جریانی از یادداشت‌های کاربران شهر'}
            </p>
          </div>
          <Link
            href="/dashboard/feeds"
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            <PenLine className="size-4" aria-hidden />
            ثبت پست
          </Link>
        </div>

        <div className="shrink-0">
          <Filters value={filters} topics={facets.topics} onChange={setFilters} />
        </div>

        {error ? (
          <p className="mt-3 shrink-0 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {/* The single scrolling region: the post stream. Centred and capped so
            a text-first feed reads comfortably on wide screens. */}
        <div className="directory-list mt-4 min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-4">
            {loading && items.length === 0 ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="indeed-panel h-40 animate-pulse bg-soft" />
              ))
            ) : items.length === 0 ? (
              <div className="indeed-panel p-10 text-center">
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
                  <div className="py-3 text-center text-xs text-muted">
                    در حال بارگذاری موارد بیشتر...
                  </div>
                ) : null}
                {!loading && meta && !meta.hasNext ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-center text-xs text-muted">
                    <Info className="size-3.5" aria-hidden />
                    همهٔ پست‌ها نمایش داده شد.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </main>
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
