'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Bookmark, IdCard, ImagePlus } from 'lucide-react';

import { SaveButton } from '@/components/ui/SaveButton';
import { Pagination } from '@/components/ui/Pagination';
import { api, type FeedPost, type Paged, type SavedItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Tab = 'biolinks' | 'business-cards' | 'feeds';

const TABS: Array<{ key: Tab; label: string; icon: typeof IdCard }> = [
  { key: 'biolinks', label: 'بیولینک‌ها', icon: IdCard },
  { key: 'business-cards', label: 'کارت‌های ویزیت', icon: BadgeCheck },
  { key: 'feeds', label: 'فیدها', icon: ImagePlus },
];

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

/**
 * «ذخیره‌شده‌های من» — a table view with one tab per kind (biolinks, business
 * cards, feeds). Each list is paginated independently and shares the same
 * remove-on-un-save flow as before.
 */
export default function SavedPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [tab, setTab] = useState<Tab>('biolinks');
  const [biolinks, setBiolinks] = useState<SavedItem[]>([]);
  const [businessCards, setBusinessCards] = useState<SavedItem[]>([]);
  const [feeds, setFeeds] = useState<FeedPost[]>([]);
  const [biolinkMeta, setBiolinkMeta] = useState<Paged<SavedItem>['meta'] | null>(null);
  const [cardMeta, setCardMeta] = useState<Paged<SavedItem>['meta'] | null>(null);
  const [feedMeta, setFeedMeta] = useState<Paged<FeedPost>['meta'] | null>(null);
  const [biolinkPage, setBiolinkPage] = useState(1);
  const [cardPage, setCardPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c, f] = await Promise.all([
        api.get<Paged<SavedItem>>(`/biolinks/saved/mine?page=${biolinkPage}`),
        api.get<Paged<SavedItem>>(`/business-cards/saved/mine?page=${cardPage}`),
        api.get<Paged<FeedPost>>(`/feeds/mine/saved?page=${feedPage}`),
      ]);
      setBiolinks(b.items);
      setBusinessCards(c.items);
      setFeeds(f.items);
      setBiolinkMeta(b.meta);
      setCardMeta(c.meta);
      setFeedMeta(f.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [biolinkPage, cardPage, feedPage]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">ذخیره‌شده‌های من</h2>
        <p className="text-sm text-muted">
          بیولینک‌ها، کارت‌های ویزیت و پست‌های فیدی که ذخیره کرده‌اید.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : tab === 'biolinks' ? (
        <SavedTable
          kind="biolinks"
          rows={biolinks}
          onRemoved={(id) =>
            setBiolinks((prev) => prev.filter((item) => item.id !== id))
          }
          emptyLabel="بیولینکی ذخیره نشده است."
        />
      ) : tab === 'business-cards' ? (
        <SavedTable
          kind="business-cards"
          rows={businessCards}
          onRemoved={(id) =>
            setBusinessCards((prev) => prev.filter((item) => item.id !== id))
          }
          emptyLabel="کارت ویزیتی ذخیره نشده است."
        />
      ) : (
        <SavedFeedsTable
          rows={feeds}
          onRemoved={(id) => setFeeds((prev) => prev.filter((item) => item.id !== id))}
        />
      )}

      {tab === 'biolinks' && biolinkMeta ? (
        <Pagination meta={biolinkMeta} onPage={setBiolinkPage} />
      ) : null}
      {tab === 'business-cards' && cardMeta ? (
        <Pagination meta={cardMeta} onPage={setCardPage} />
      ) : null}
      {tab === 'feeds' && feedMeta ? (
        <Pagination meta={feedMeta} onPage={setFeedPage} />
      ) : null}

      {!loading && tab !== 'feeds' ? (
        <div className="flex justify-center gap-3">
          <Link href="/biolinks" className="indeed-btn indeed-btn-secondary py-2 text-sm">
            دایرکتوری بیولینک
          </Link>
          <Link href="/business-cards" className="indeed-btn indeed-btn-secondary py-2 text-sm">
            دایرکتوری کارت ویزیت
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SavedTable({
  kind,
  rows,
  onRemoved,
  emptyLabel,
}: {
  kind: 'biolinks' | 'business-cards';
  rows: SavedItem[];
  onRemoved: (id: string) => void;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="indeed-panel p-6 text-center text-sm text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="indeed-panel overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] text-right text-xs text-muted">
            <th className="px-3 py-3 font-bold">عنوان</th>
            <th className="px-3 py-3 font-bold">شرکت</th>
            <th className="px-3 py-3 font-bold">تاریخ ذخیره</th>
            <th className="px-3 py-3 font-bold">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={item.id}
              className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0"
            >
              <td className="px-3 py-3 font-bold text-ink">{item.fullName}</td>
              <td className="px-3 py-3 text-muted">{item.company ?? item.jobTitle ?? '—'}</td>
              <td className="px-3 py-3 text-xs text-muted">{faDate(item.savedAt)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${kind}/${item.slug}`}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    مشاهده
                  </Link>
                  <SaveButton
                    kind={kind}
                    slug={item.slug}
                    initialSaved
                    onToggled={(saved) => {
                      if (!saved) onRemoved(item.id);
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SavedFeedsTable({
  rows,
  onRemoved,
}: {
  rows: FeedPost[];
  onRemoved: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function unsave(id: string) {
    setBusy(id);
    try {
      await api.post(`/feeds/public/${id}/save`);
      onRemoved(id);
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="indeed-panel p-6 text-center text-sm text-muted">
        پست فیدی ذخیره نشده است.
      </p>
    );
  }
  return (
    <div className="indeed-panel overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] text-right text-xs text-muted">
            <th className="px-3 py-3 font-bold">پست</th>
            <th className="px-3 py-3 font-bold">موضوع</th>
            <th className="px-3 py-3 font-bold">لایک</th>
            <th className="px-3 py-3 font-bold">تاریخ ذخیره</th>
            <th className="px-3 py-3 font-bold">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr
              key={post.id}
              className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0"
            >
              <td className="max-w-xs px-3 py-3">
                <p className="line-clamp-2 text-ink">{post.body ?? '—'}</p>
              </td>
              <td className="px-3 py-3 text-muted">{post.topic?.name ?? '—'}</td>
              <td className="px-3 py-3 text-xs text-muted">
                {post.likeCount.toLocaleString('fa-IR')}
              </td>
              <td className="px-3 py-3 text-xs text-muted">
                {post.savedAt ? faDate(post.savedAt) : faDate(post.createdAt)}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/feeds/${post.id}`}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    مشاهده
                  </Link>
                  <button
                    type="button"
                    disabled={busy === post.id}
                    onClick={() => unsave(post.id)}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs text-amber-600 disabled:opacity-60"
                  >
                    <Bookmark className="size-3.5 fill-current" aria-hidden />
                    ذخیره‌شده
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
