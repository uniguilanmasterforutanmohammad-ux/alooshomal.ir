'use client';

import { useEffect, useState } from 'react';

/** The two looks a public directory can render in. */
export type DirectoryView = 'list' | 'tiles';

const STORAGE_KEY = 'alooshomal:directory-view';

/**
 * Remembers whether the visitor prefers the classic split list or the tiled
 * grid. Persisted in `localStorage` so the choice sticks across both directory
 * pages and reloads; defaults to the classic list.
 */
export function useDirectoryView() {
  const [view, setView] = useState<DirectoryView>('list');

  // Read once on mount (client-only, so SSR always renders the list first).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'tiles' || stored === 'list') setView(stored);
    } catch {
      // storage unavailable (private mode) — keep the default
    }
  }, []);

  function update(next: DirectoryView) {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  }

  return { view, setView: update };
}
