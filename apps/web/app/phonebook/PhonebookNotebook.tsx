'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, MapPin, Phone, Search, Smartphone } from 'lucide-react';

import type { PhonebookEntry } from '@/lib/api';
import {
  useDirectoryResults,
  useInfiniteScroll,
  type DirectoryMeta,
} from '@/lib/directory';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'phonebook_saved_v2';

type PhonebookSort = 'alpha' | 'recent';

/** Fallback avatar palette, used when a card has no `primaryColor`. */
const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

/** A saved bookmark stores the whole row so «ذخیره‌های من» works even when the
    contact lives on a page that has not been scrolled into view yet. */
interface SavedEntry {
  slug: string;
  entry: PhonebookEntry;
}

/** Normalizes Persian/Arabic digits and drops separators for search. */
function normalize(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s-]/g, '')
    .toLowerCase();
}

/** Wraps the first query match in the text so the list can highlight it. */
function highlight(text: string, query: string): React.ReactNode {
  const index = query ? text.indexOf(query) : -1;
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function avatarColor(entry: PhonebookEntry, index: number): string {
  const color = entry.primaryColor?.trim();
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
    ? color
    : COLORS[index % COLORS.length];
}

/** Only the initial letter of the name is shown — never a logo or avatar. */
function Avatar({ entry, index }: { entry: PhonebookEntry; index: number }) {
  return (
    <div
      className="pb-avatar"
      style={{ background: avatarColor(entry, index) }}
      aria-hidden
    >
      {entry.fullName.trim().charAt(0)}
    </div>
  );
}

/** One contact row, shared by the directory list and «ذخیره‌های من». */
function ContactRow({
  entry,
  index,
  query,
  marked,
  onToggleSave,
}: {
  entry: PhonebookEntry;
  index: number;
  query: string;
  marked: boolean;
  onToggleSave: (entry: PhonebookEntry) => void;
}) {
  const mobile = entry.mobile?.trim() || '';
  const landline = entry.phone?.trim() || '';
  const primary = mobile || landline;
  const meta = [entry.jobTitle, entry.company].filter(Boolean).join(' · ');
  const place = [entry.city?.name, entry.business?.name].filter(Boolean).join(' · ');

  return (
    <div className="pb-row">
      <Avatar entry={entry} index={index} />

      <div className="pb-info">
        <span className="pb-name">{highlight(entry.fullName, query)}</span>
        {meta ? <span className="pb-meta">{highlight(meta, query)}</span> : null}
        {place ? (
          <span className="pb-place">
            <MapPin className="size-3" aria-hidden />
            {place}
          </span>
        ) : null}
        <div className="pb-phones">
          {mobile ? (
            <span className="pb-phone">
              <Smartphone className="size-3.5" aria-hidden />
              <span className="pb-phone-label">همراه</span>
              <span className="pb-phone-num">{highlight(mobile, query.replace(/\s/g, ''))}</span>
            </span>
          ) : null}
          {landline ? (
            <span className="pb-phone">
              <Phone className="size-3.5" aria-hidden />
              <span className="pb-phone-label">ثابت</span>
              <span className="pb-phone-num">
                {highlight(landline, query.replace(/\s/g, ''))}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="pb-actions">
        <button
          type="button"
          className="pb-save"
          aria-pressed={marked}
          aria-label={marked ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره'}
          title={marked ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره'}
          onClick={() => onToggleSave(entry)}
        >
          <Bookmark className="size-4" aria-hidden fill={marked ? 'currentColor' : 'none'} />
        </button>
        <a className="pb-call" href={`tel:${primary}`} aria-label={`تماس با ${entry.fullName}`}>
          تماس
        </a>
      </div>
    </div>
  );
}

/**
 * دفترچه تلفن — the public phonebook over the published business cards.
 *
 * Data comes from the paginated `/business-cards/public/phonebook` endpoint and
 * is consumed through the same infinite-scroll machinery as the other public
 * directories (`useDirectoryResults` + `useInfiniteScroll`), so the notebook
 * body is the only scrolling region and the page chrome stays put. The
 * «ذخیره‌های من» bookmark list is kept in `localStorage` (no account needed) and
 * stores the whole row, so it renders completely regardless of which pages have
 * been scrolled into view.
 */
export function PhonebookNotebook({
  initialData,
}: {
  initialData: {
    items: PhonebookEntry[];
    meta: DirectoryMeta;
    filters: Record<string, never>;
  } | null;
}) {
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PhonebookSort>('alpha');
  const [view, setView] = useState<'all' | 'saved'>('all');
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Debounce the search so typing does not fire a request per keystroke, while
  // still feeling immediate.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('sort', sort);
    return params.toString();
  }, [query, sort]);

  const { items, meta, loading, error, loadMore } = useDirectoryResults<
    PhonebookEntry,
    Record<string, never>
  >({
    path: '/business-cards/public/phonebook',
    query: queryString,
    mode: 'INFINITE',
    initialData,
  });

  const sentinelRef = useInfiniteScroll(view === 'all', loading, loadMore);

  // Bookmarks live in the browser; read them once after mount so the SSR markup
  // and the first client render match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) {
        setSaved(
          parsed.filter(
            (item): item is SavedEntry =>
              Boolean(item) && typeof item === 'object' && 'slug' in item && 'entry' in item,
          ),
        );
      }
    } catch {
      // storage unavailable (private mode) — start empty
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SavedEntry[]) => {
    setSaved(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  }, []);

  const isSaved = useCallback(
    (slug: string) => saved.some((item) => item.slug === slug),
    [saved],
  );

  const toggleSave = useCallback(
    (entry: PhonebookEntry) => {
      persist(
        saved.some((item) => item.slug === entry.slug)
          ? saved.filter((item) => item.slug !== entry.slug)
          : [{ slug: entry.slug, entry }, ...saved],
      );
    },
    [persist, saved],
  );

  const clearSaved = useCallback(() => persist([]), [persist]);

  // Highlight the query in the list rows using the same digits-normalized form
  // the backend searched with.
  const highlightQuery = query.trim();

  const total = meta?.total ?? items.length;
  const shown = items.length;

  return (
    <main className="container-page py-4 directory-shell pb-shell">
      <h1 className="sr-only">دفترچه تلفن</h1>

      {/* Fixed notebook chrome: search, sort and the two views. */}
      <div className="shrink-0 pb-chrome">
        <div className="pb-search-wrap">
          <Search className="pb-search-icon" aria-hidden />
          <input
            className="pb-search"
            type="search"
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder="جستجو در نام، شماره، شغل یا کسب‌وکار ..."
            aria-label="جستجو در نام، شماره، شغل یا کسب‌وکار"
          />
        </div>

        <div className="pb-bar">
          <div className="pb-switch" role="group" aria-label="حالت نمایش">
            <button
              type="button"
              aria-pressed={view === 'all'}
              className={cn(view === 'all' && 'on')}
              onClick={() => setView('all')}
            >
              همه مخاطبین
            </button>
            <button
              type="button"
              aria-pressed={view === 'saved'}
              className={cn(view === 'saved' && 'on')}
              onClick={() => setView('saved')}
            >
              <Bookmark
                className="size-3.5"
                aria-hidden
                fill={view === 'saved' ? 'currentColor' : 'none'}
              />
              {`ذخیره‌های من (${hydrated ? saved.length.toLocaleString('fa-IR') : '۰'})`}
            </button>
          </div>

          {view === 'all' ? (
            <div className="pb-sort" role="group" aria-label="ترتیب نمایش">
              <button
                type="button"
                aria-pressed={sort === 'alpha'}
                className={cn(sort === 'alpha' && 'on')}
                onClick={() => setSort('alpha')}
              >
                الفبایی
              </button>
              <button
                type="button"
                aria-pressed={sort === 'recent'}
                className={cn(sort === 'recent' && 'on')}
                onClick={() => setSort('recent')}
              >
                جدیدترین
              </button>
            </div>
          ) : null}
        </div>

        <div className="pb-count">
          {view === 'all' ? (
            loading && shown === 0 ? (
              'در حال بارگذاری...'
            ) : (
              `${shown.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')} مخاطب`
            )
          ) : (
            `${saved.length.toLocaleString('fa-IR')} مخاطب ذخیره‌شده`
          )}
        </div>
      </div>

      {error ? (
        <p className="shrink-0 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {/* The single scrolling region: the notebook body. */}
      <div className="directory-list pb-list min-h-0 flex-1">
        {view === 'all' ? (
          loading && shown === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="pb-skeleton" />
              ))}
            </div>
          ) : shown === 0 ? (
            <div className="pb-empty">مخاطبی پیدا نشد</div>
          ) : (
            <>
              {items.map((entry, index) => (
                <ContactRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  query={highlightQuery}
                  marked={isSaved(entry.slug)}
                  onToggleSave={toggleSave}
                />
              ))}
              <div ref={sentinelRef} className="h-2" aria-hidden />
              {loading ? (
                <div className="pb-more">در حال بارگذاری موارد بیشتر...</div>
              ) : null}
              {!loading && meta && !meta.hasNext ? (
                <div className="pb-more">همه نتایج نمایش داده شد.</div>
              ) : null}
            </>
          )
        ) : saved.length === 0 ? (
          <div className="pb-empty">
            هنوز مخاطبی ذخیره نکرده‌اید
            <span className="pb-empty-hint">
              روی آیکون ذخیره‌ی هر مخاطب بزنید تا اینجا نمایش داده شود.
            </span>
          </div>
        ) : (
          <>
            <div className="pb-saved-head">
              <span>{`${saved.length.toLocaleString('fa-IR')} مخاطب ذخیره‌شده`}</span>
              <button type="button" className="pb-clear" onClick={clearSaved}>
                پاک‌کردن همه
              </button>
            </div>
            {saved.map((item, index) => (
              <ContactRow
                key={item.slug}
                entry={item.entry}
                index={index}
                query={highlightQuery}
                marked
                onToggleSave={toggleSave}
              />
            ))}
          </>
        )}
      </div>

      <div className="shrink-0 pb-foot">
        <span>کارت ویزیت کامل هر مخاطب را ببینید</span>
        <Link href="/business-cards" prefetch={false}>
          مشاهدهٔ دایرکتوری
        </Link>
      </div>
    </main>
  );
}
