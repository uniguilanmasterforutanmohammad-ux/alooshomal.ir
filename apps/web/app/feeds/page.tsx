'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { FeedCard } from '@/components/feed/FeedCard';
import type { FeedPost, FeedTopic } from '@/lib/api';
import {
  useDirectoryResults,
  useInfiniteScroll,
} from '@/lib/directory';

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

  // The feed list is always infinite-scroll (like the other directories): the
  // page chrome stays fixed and only the list scrolls.
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
      {/* Fixed shell: heading + filters stay put and only the list below
          scrolls (see `.directory-shell` in globals.css). The footer is
          intentionally omitted so the shell can fill the viewport exactly. */}
      <main className="container-page py-6 directory-shell">
        <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="vintage-avatar flex size-11 items-center justify-center">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-ink">فیدها</h1>
              <p className="text-sm text-muted">
                {meta
                  ? `${meta.total.toLocaleString('fa-IR')} پست منتشرشده — نمایش ${items.length.toLocaleString('fa-IR')} مورد`
                  : 'پست‌های کاربران شهر'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/feeds"
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            ثبت پست و اشتراک فید
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

        <div className="directory-list mt-4 min-h-0 flex-1">
          {loading && items.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="indeed-panel h-28 animate-pulse bg-soft" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="indeed-panel p-10 text-center">
              <p className="text-lg font-bold text-ink">پستی برای نمایش یافت نشد</p>
              <p className="mt-2 text-sm text-muted">
                عبارت جستجو یا موضوع را تغییر دهید.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((post) => (
                  <FeedCard key={post.id} post={post} />
                ))}
              </div>
              <div ref={sentinelRef} className="h-2" aria-hidden />
              {loading ? (
                <div className="py-3 text-center text-xs text-muted">
                  در حال بارگذاری موارد بیشتر...
                </div>
              ) : null}
              {!loading && meta && !meta.hasNext ? (
                <div className="py-3 text-center text-xs text-muted">
                  همه نتایج نمایش داده شد.
                </div>
              ) : null}
            </>
          )}
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
