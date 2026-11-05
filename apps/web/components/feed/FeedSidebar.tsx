'use client';

import Link from 'next/link';
import { Hash, PenLine, TrendingUp } from 'lucide-react';

import { FeedSearch } from '@/components/feed/FeedSearch';
import type { FeedTopic } from '@/lib/api';

interface Props {
  topics: FeedTopic[];
  activeTopicId: string;
  searchValue: string;
  onSearch: (value: string) => void;
  onSelectTopic: (topicId: string) => void;
}

/**
 * Right-hand column of the Twitter-style feed: a sticky search box, the
 * «موضوع‌های داغ» list (the same topics as the header chips, acting as quick
 * filters) and a composer call-to-action. Desktop only — phones get the search
 * panel in the header instead.
 */
export function FeedSidebar({
  topics,
  activeTopicId,
  searchValue,
  onSearch,
  onSelectTopic,
}: Props) {
  return (
    <aside className="tw-sidebar" aria-label="جستجو و موضوع‌ها">
      <FeedSearch value={searchValue} onSubmit={onSearch} />

      <section className="tw-card mt-4" aria-labelledby="tw-trends-title">
        <h2
          id="tw-trends-title"
          className="flex items-center gap-2 px-4 pb-1 pt-3 text-lg font-extrabold text-ink"
        >
          <TrendingUp className="size-5 text-brand" aria-hidden />
          موضوع‌های داغ
        </h2>
        {topics.length ? (
          topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => onSelectTopic(topic.id)}
              className="tw-trend"
              data-active={activeTopicId === topic.id}
            >
              <span className="text-[11px] text-muted">موضوع</span>
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-ink">
                <Hash className="size-3.5 text-brand" aria-hidden />
                {topic.name}
              </span>
            </button>
          ))
        ) : (
          <p className="px-4 py-3 text-xs text-muted">هنوز موضوعی ثبت نشده است.</p>
        )}
        <button
          type="button"
          onClick={() => onSelectTopic('')}
          className="tw-card-more"
        >
          نمایش همهٔ پست‌ها
        </button>
      </section>

      <section className="tw-card p-4" aria-labelledby="tw-cta-title">
        <h2 id="tw-cta-title" className="text-lg font-extrabold text-ink">
          پست خودت را بنویس
        </h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          یادداشت، عکس یا معرفی کسب‌وکارت را با شهر به اشتراک بگذار. پست پس از
          تأیید مدیر در همین جریان منتشر می‌شود.
        </p>
        <Link
          href="/dashboard/feeds"
          className="indeed-btn indeed-btn-primary mt-3 w-full justify-center rounded-full py-2.5 text-sm"
        >
          <PenLine className="size-4" aria-hidden />
          ثبت پست
        </Link>
      </section>

      <nav className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px] text-muted">
        <Link href="/guide" className="hover:text-brand">
          راهنما
        </Link>
        <Link href="/rules" className="hover:text-brand">
          قوانین
        </Link>
        <Link href="/dashboard/tickets" className="hover:text-brand">
          پشتیبانی
        </Link>
        <Link href="/" className="hover:text-brand">
          خانه
        </Link>
      </nav>
    </aside>
  );
}
