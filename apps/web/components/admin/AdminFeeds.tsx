'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

import { CommentsModeration } from './feeds/CommentsModeration';
import { FeedSettings } from './feeds/FeedSettings';
import { PackagesPanel } from './feeds/PackagesPanel';
import { PostsModeration } from './feeds/PostsModeration';
import { SubscriptionsPanel } from './feeds/SubscriptionsPanel';
import { TopicsPanel } from './feeds/TopicsPanel';
import type { Tab } from './feeds/shared';

const TABS: Array<[Tab, string]> = [
  ['posts', 'بررسی پست‌ها'],
  ['comments', 'کامنت‌ها'],
  ['subscriptions', 'اشتراک‌ها'],
  ['packages', 'بسته‌ها'],
  ['topics', 'موضوع‌ها'],
  ['settings', 'تنظیمات'],
];

/**
 * Admin «فیدها» panel with tabs: post moderation, user subscriptions, package
 * management, topic management and the image limits (max images + max size).
 * Each tab lives in its own component under `components/admin/feeds/`.
 */
export function AdminFeeds() {
  const [tab, setTab] = useState<Tab>('posts');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts' ? <PostsModeration /> : null}
      {tab === 'comments' ? <CommentsModeration /> : null}
      {tab === 'subscriptions' ? <SubscriptionsPanel /> : null}
      {tab === 'packages' ? <PackagesPanel /> : null}
      {tab === 'topics' ? <TopicsPanel /> : null}
      {tab === 'settings' ? <FeedSettings /> : null}
    </div>
  );
}
