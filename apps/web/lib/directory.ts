'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api, type DirectoryFacet } from './api';

/** How the public directories display their results. */
export type DirectoryDisplayMode = 'PAGINATION' | 'INFINITE';

interface PublicSettings {
  directoryDisplayMode: DirectoryDisplayMode;
}

/**
 * Reads the admin-chosen directory display mode. Falls back to classic
 * pagination until the public settings answer arrives (or when it fails), so
 * the pages always render something usable.
 */
export function useDirectoryDisplayMode(): DirectoryDisplayMode {
  const [mode, setMode] = useState<DirectoryDisplayMode>('PAGINATION');

  useEffect(() => {
    let active = true;
    api
      .get<PublicSettings>('/settings/public')
      .then((result) => {
        if (active) {
          setMode(
            result.directoryDisplayMode === 'INFINITE' ? 'INFINITE' : 'PAGINATION',
          );
        }
      })
      .catch(() => {
        // keep the pagination fallback
      });
    return () => {
      active = false;
    };
  }, []);

  return mode;
}

export interface DirectoryMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DirectoryResult<T> {
  items: T[];
  meta: DirectoryMeta;
  filters: {
    cities: DirectoryFacet[];
    businesses: DirectoryFacet[];
  };
}

interface Options {
  path: string;
  /** Everything after the page number, already URL-encoded (may be empty). */
  query: string;
  mode: DirectoryDisplayMode;
  /** Page to start on (e.g. restored from a shareable URL). Defaults to 1. */
  initialPage?: number;
}

/**
 * Owns a public directory's page state and fetching. In `INFINITE` mode new
 * pages are appended (scroll-to-load) via `loadMore`; otherwise each page
 * replaces the previous one and the caller drives `setPage` through the
 * returned pagination controls. Any query change resets to the first page and
 * replaces the list, so stale rows never linger after a new search.
 */
export function useDirectoryResults<T>({
  path,
  query,
  mode,
  initialPage = 1,
}: Options) {
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<DirectoryMeta | null>(null);
  const [facets, setFacets] = useState<DirectoryResult<T>['filters']>({
    cities: [],
    businesses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The last page whose response actually landed. `loadMore` compares against
  // it (not against React state) so a burst of scroll events can never request
  // the same next page twice, and never skips one either.
  const loadedPage = useRef(0);
  // Whether the server reported more pages after what was last loaded.
  const hasMore = useRef(false);
  // `query|mode` of the previous render. Any change restarts at page 1, while
  // the initial render (and React's dev double-invoke) leaves the page as-is so
  // an `initialPage` restored from the URL is preserved.
  const lastKey = useRef(`${query}|${mode}`);
  // When the query/mode changes we force page 1 for this render, before the
  // reset effect runs, so a stale page number is never fetched for the new
  // query.
  const effectivePage = lastKey.current === `${query}|${mode}` ? page : 1;

  const fullQuery = useMemo(() => {
    const params = new URLSearchParams(query);
    if (effectivePage > 1) params.set('page', String(effectivePage));
    return params.toString();
  }, [query, effectivePage]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<DirectoryResult<T>>(`${path}?${fullQuery}`)
      .then((result) => {
        if (controller.signal.aborted) return;
        loadedPage.current = result.meta.page;
        hasMore.current = result.meta.hasNext;
        const replace =
          mode !== 'INFINITE' || result.meta.page <= 1;
        setItems((previous) =>
          replace ? result.items : [...previous, ...result.items],
        );
        setMeta(result.meta);
        setFacets(result.filters);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'خطا در بارگذاری فهرست');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, fullQuery, mode]);

  // A new query (or display mode) restarts from the first page.
  useEffect(() => {
    const key = `${query}|${mode}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    setPage(1);
  }, [query, mode]);

  const loadMore = useCallback(() => {
    if (mode !== 'INFINITE' || loading || !hasMore.current) return;
    setPage((current) => (current === loadedPage.current ? current + 1 : current));
  }, [mode, loading]);

  return {
    items,
    meta,
    filters: facets,
    loading,
    error,
    page,
    setPage,
    loadMore,
  };
}

/**
 * Returns a ref to place on a sentinel at the end of the list. Unlike a plain
 * `IntersectionObserver`, this watches the *scroll position* and fires well
 * before the sentinel is visible (when the remaining distance to the bottom is
 * less than `distanceThreshold`). That way the next page is already being
 * fetched while the visitor is still ~10 items away from the end, so the list
 * never hits a hard stop or jumps — the load feels seamless.
 *
 * The scroll container is discovered by walking up from the sentinel, which
 * covers both cases used by the directory pages: the inner `.directory-list`
 * scroller on phones/tablets and the window scroller on desktop.
 */
export function useInfiniteScroll(
  enabled: boolean,
  loading: boolean,
  onReachEnd: () => void,
  distanceThreshold = 900,
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const state = useRef({ loading, onReachEnd });
  state.current = { loading, onReachEnd };

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    // Find the nearest scrollable ancestor (the inner list on mobile). If none
    // is scrollable the window owns the scroll (desktop).
    let scroller: HTMLElement | null = node.parentElement;
    while (scroller && scroller !== document.body) {
      const overflowY = getComputedStyle(scroller).overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        scroller.scrollHeight > scroller.clientHeight + 4
      ) {
        break;
      }
      scroller = scroller.parentElement;
    }
    const useWindow = !scroller || scroller === document.body;

    const distanceToBottom = () => {
      const rect = node.getBoundingClientRect();
      const viewportBottom = useWindow
        ? window.innerHeight
        : (scroller as HTMLElement).getBoundingClientRect().bottom;
      return rect.top - viewportBottom;
    };

    const check = () => {
      // `onReachEnd` is idempotent: the caller only advances the page when the
      // previously requested page has actually arrived, so firing this on every
      // scroll tick can never queue duplicate pages.
      if (state.current.loading) return;
      if (distanceToBottom() <= distanceThreshold) {
        state.current.onReachEnd();
      }
    };

    const target: HTMLElement | Window = useWindow ? window : (scroller as HTMLElement);
    target.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    // Run once on mount / after each page append so a short first page keeps
    // filling the viewport without waiting for the visitor to scroll.
    const raf = requestAnimationFrame(check);

    return () => {
      target.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      cancelAnimationFrame(raf);
    };
  }, [enabled, loading, distanceThreshold]);

  return ref;
}
