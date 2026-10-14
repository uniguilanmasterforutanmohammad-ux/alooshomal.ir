'use client';

import { useEffect, useRef, useState } from 'react';

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

/**
 * Fetches one page of a public directory. In `INFINITE` mode a page after the
 * first is appended to the existing list (scroll-to-load); otherwise each page
 * replaces the previous one. Changing `query` or going back to page 1 always
 * replaces, so stale rows never linger after a new search.
 */
export function useDirectoryResults<T>(
  path: string,
  query: string,
  page: number,
  mode: DirectoryDisplayMode,
) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<DirectoryMeta | null>(null);
  const [facets, setFacets] = useState<DirectoryResult<T>['filters']>({
    cities: [],
    businesses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const lastQuery = useRef<string | null>(null);

  useEffect(() => {
    // A new query (search/filter change) always replaces the list, so a page
    // from the previous search can never be appended to the new results.
    const queryChanged = lastQuery.current !== query;
    lastQuery.current = query;
    const replace = mode !== 'INFINITE' || page <= 1 || queryChanged;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    api
      .get<DirectoryResult<T>>(`${path}?${query}`)
      .then((result) => {
        if (id !== requestId.current) return;
        setItems((previous) =>
          replace ? result.items : [...previous, ...result.items],
        );
        setMeta(result.meta);
        setFacets(result.filters);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری فهرست');
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [path, query, page, mode]);

  return { items, meta, filters: facets, loading, error };
}

/**
 * Returns a ref to place on a sentinel at the end of the list. Whenever the
 * sentinel scrolls into view (and there is no request in flight) `onReachEnd`
 * is called, which the caller uses to fetch the next page.
 */
export function useInfiniteScroll(
  enabled: boolean,
  loading: boolean,
  onReachEnd: () => void,
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callback = useRef(onReachEnd);
  callback.current = onReachEnd;

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loading) {
          callback.current();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, loading]);

  return ref;
}
