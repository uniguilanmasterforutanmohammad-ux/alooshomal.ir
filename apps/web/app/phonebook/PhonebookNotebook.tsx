'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import type { PhonebookEntry } from '@/lib/api';

/** Rows per flipped leaf in the «ذخیره‌های من» view. */
const PER_PAGE = 5;
/** Duration of a single leaf turn; must match `.pb-leaf` in the stylesheet. */
const FLIP_MS = 650;
const STORAGE_KEY = 'phonebook_saved_v1';

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

function Avatar({ entry, index }: { entry: PhonebookEntry; index: number }) {
  if (entry.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatarUrl}
        alt={entry.fullName}
        className="pb-avatar"
        style={{ background: avatarColor(entry, index) }}
      />
    );
  }
  return (
    <div className="pb-avatar" style={{ background: avatarColor(entry, index) }} aria-hidden>
      {entry.fullName.trim().charAt(0)}
    </div>
  );
}

/** One contact row, shared by the all-contacts list and the save pages. */
function ContactRow({
  entry,
  index,
  query,
  trailing,
}: {
  entry: PhonebookEntry;
  index: number;
  query: string;
  trailing: React.ReactNode;
}) {
  const number = entry.mobile || entry.phone || '';
  return (
    <div className="pb-row">
      <Avatar entry={entry} index={index} />
      <div className="pb-info">
        <span className="pb-name">{highlight(entry.fullName, query)}</span>
        <span className="pb-phone">{highlight(number, query.replace(/\s/g, ''))}</span>
      </div>
      {trailing}
      <a className="pb-call" href={`tel:${number}`}>
        تماس
      </a>
    </div>
  );
}

/**
 * دفترچه تلفن — the public phonebook over the published business cards.
 *
 * The server seeds the list (see the page's RSC fetch); this component owns the
 * search box, the «ذخیره‌های من» star picker (kept in `localStorage`, so a
 * visitor can bookmark numbers without an account) and the page-flip animation
 * of the saved-leaves view.
 */
export function PhonebookNotebook({ initialEntries }: { initialEntries: PhonebookEntry[] }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'saved'>('all');
  const [saved, setSaved] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  // The leaf currently turning (when non-null), the page it turns towards, and
  // whether the CSS transition has been armed yet (a leaf must be painted in
  // its start state for one frame before the `go` class can animate it).
  const [flip, setFlip] = useState<{ dir: 1 | -1; target: number; armed: boolean } | null>(
    null,
  );
  const timeoutRef = useRef<number | null>(null);

  // Saved slugs live in the browser; read them once after mount so the SSR
  // markup and the first client render match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) setSaved(parsed.filter((s) => typeof s === 'string'));
    } catch {
      // storage unavailable (private mode) — start empty
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    setSaved(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  }, []);

  // Contacts sorted by name using the browser's Persian collation.
  const sorted = useMemo(
    () => [...initialEntries].sort((a, b) => a.fullName.localeCompare(b.fullName, 'fa')),
    [initialEntries],
  );

  const savedEntries = useMemo(() => {
    const set = new Set(saved);
    return sorted.filter((entry) => set.has(entry.slug));
  }, [sorted, saved]);

  const filtered = useMemo(() => {
    const raw = query.trim();
    const q = normalize(raw);
    if (!q) return sorted;
    return sorted.filter((entry) => {
      const number = entry.mobile || entry.phone || '';
      return (
        normalize(entry.fullName).includes(q) ||
        normalize(number).includes(q) ||
        normalize(entry.company ?? '').includes(q) ||
        normalize(entry.jobTitle ?? '').includes(q)
      );
    });
  }, [sorted, query]);

  const savedPages = useMemo(() => {
    const pages: PhonebookEntry[][] = [];
    for (let i = 0; i < savedEntries.length; i += PER_PAGE) {
      pages.push(savedEntries.slice(i, i + PER_PAGE));
    }
    return pages;
  }, [savedEntries]);

  const isSaved = useCallback((slug: string) => saved.includes(slug), [saved]);

  const toggleSave = useCallback(
    (slug: string) => {
      persist(saved.includes(slug) ? saved.filter((s) => s !== slug) : [...saved, slug]);
    },
    [persist, saved],
  );

  // Keep the leaf page in range when bookmarks are removed.
  useEffect(() => {
    if (page >= savedPages.length && savedPages.length > 0) {
      setPage(savedPages.length - 1);
    }
  }, [page, savedPages.length]);

  /** Turns one leaf towards `target`: the current page folds over the target. */
  const startFlip = useCallback(
    (dir: 1 | -1) => {
      const target = page + dir;
      if (flip || target < 0 || target >= savedPages.length) return;
      setFlip({ dir, target, armed: false });
      // Arm the transition on the next frame so the freshly mounted leaf is
      // first painted in its start state, then animates to the end state.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setFlip((current) =>
            current && !current.armed ? { ...current, armed: true } : current,
          );
        });
      });
      timeoutRef.current = window.setTimeout(() => {
        setPage(target);
        setFlip(null);
        timeoutRef.current = null;
      }, FLIP_MS);
    },
    [flip, page, savedPages.length],
  );

  const hasSaves = savedPages.length > 0;
  const currentItems = savedPages[page] ?? [];
  // The page a turning leaf reveals underneath (the destination).
  const revealItems = flip ? savedPages[flip.target] ?? [] : [];

  const renderPage = (items: PhonebookEntry[], pageNo: number) => (
    <>
      <div className="pb-pgno">{pageNo.toLocaleString('fa-IR')}</div>
      {items.map((entry, index) => (
        <ContactRow
          key={entry.id}
          entry={entry}
          index={index}
          query=""
          trailing={
            <button
              type="button"
              className="pb-unsave"
              data-phone={entry.slug}
              onClick={() => toggleSave(entry.slug)}
            >
              حذف
            </button>
          }
        />
      ))}
    </>
  );

  return (
    <div className="pb-page" dir="rtl">
      <div className="pb-book pb-paper">
        <header className="pb-head">
          <h1>دفترچه تلفن</h1>
          <input
            className="pb-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو در نام یا شماره ..."
            aria-label="جستجو در نام یا شماره"
          />
          <div className="pb-tabs">
            <button
              type="button"
              className={`pb-tab${view === 'all' ? ' on' : ''}`}
              onClick={() => setView('all')}
            >
              همه مخاطبین
            </button>
            <button
              type="button"
              className={`pb-tab${view === 'saved' ? ' on' : ''}`}
              onClick={() => setView('saved')}
            >
              {`ذخیره‌های من (${hydrated ? saved.length.toLocaleString('fa-IR') : '۰'})`}
            </button>
          </div>
        </header>

        {view === 'all' ? (
          <div>
            <div className="pb-count">
              {`${filtered.length.toLocaleString('fa-IR')} از ${sorted.length.toLocaleString('fa-IR')} مخاطب`}
            </div>
            <ul className="pb-list">
              {filtered.map((entry, index) => {
                const marked = isSaved(entry.slug);
                return (
                  <li key={entry.id}>
                    <ContactRow
                      entry={entry}
                      index={index}
                      query={query.trim()}
                      trailing={
                        <button
                          type="button"
                          className="pb-star"
                          data-phone={entry.slug}
                          title={marked ? 'حذف از ذخیره' : 'ذخیره'}
                          aria-pressed={marked}
                          aria-label={marked ? 'حذف از ذخیره' : 'ذخیره'}
                          onClick={() => toggleSave(entry.slug)}
                        >
                          <Star
                            className="size-4"
                            aria-hidden
                            fill={marked ? 'currentColor' : 'none'}
                          />
                        </button>
                      }
                    />
                  </li>
                );
              })}
            </ul>
            {filtered.length === 0 ? (
              <div className="pb-empty">مخاطبی پیدا نشد</div>
            ) : null}
          </div>
        ) : (
          <div>
            {hasSaves ? (
              <>
                <div className="pb-flipper">
                  <div className="pb-sheet">
                    {/* Underneath: the destination page (or the current one). */}
                    <div className="pb-sheet-content pb-paper">
                      {renderPage(flip ? revealItems : currentItems, (flip ? flip.target : page) + 1)}
                    </div>
                    {/* The turning leaf: front shows the current page, back the
                        destination; a negative turn reverses which face leads. */}
                    {flip ? (
                      <div
                        className={`pb-leaf ${flip.dir > 0 ? 'fwd' : 'bwd'}${
                          flip.armed ? ' go' : ''
                        }`}
                        aria-hidden
                      >
                        <div className="pb-face front pb-paper">
                          {renderPage(currentItems, page + 1)}
                        </div>
                        <div className="pb-face back pb-paper">
                          {renderPage(revealItems, flip.target + 1)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="pb-pgbar">
                  <button type="button" disabled={page <= 0 || Boolean(flip)} onClick={() => startFlip(-1)}>
                    ◀ قبلی
                  </button>
                  <span>
                    {`صفحه ${(page + 1).toLocaleString('fa-IR')} از ${savedPages.length.toLocaleString('fa-IR')}`}
                  </span>
                  <button
                    type="button"
                    disabled={page >= savedPages.length - 1 || Boolean(flip)}
                    onClick={() => startFlip(1)}
                  >
                    بعدی ▶
                  </button>
                </div>
              </>
            ) : (
              <div className="pb-empty">هنوز مخاطبی ذخیره نکرده‌اید</div>
            )}
          </div>
        )}

        <div className="pb-count pb-foot">
          <Link href="/business-cards">مشاهدهٔ کارت ویزیت کامل هر مخاطب</Link>
        </div>
      </div>
    </div>
  );
}
