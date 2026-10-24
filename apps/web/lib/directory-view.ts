'use client';

import { useEffect, useState } from 'react';

/** The looks a public directory can render in. */
export type DirectoryView = 'list' | 'tiles' | 'notebook';

const ALL_VIEWS: DirectoryView[] = ['list', 'tiles', 'notebook'];

/** Views each directory offers (stable references for effect deps). */
export const DIRECTORY_VIEWS_ALL = ALL_VIEWS;
export const DIRECTORY_VIEWS_NO_NOTEBOOK: DirectoryView[] = ['list', 'tiles'];

const STORAGE_KEY = 'alooshomal:directory-view';

/**
 * Remembers whether the visitor prefers the classic split list, the tiled grid
 * or the «دفترچه تلفن» notebook. Persisted in `localStorage` so the choice
 * sticks across both directory pages and reloads; defaults to the classic list.
 *
 * `preferred` (e.g. a `?view=notebook` deep-link) wins over the stored value on
 * first mount, so shared links open in the intended look. `allowed` narrows the
 * accepted values — the notebook is only meaningful for the business-card
 * directory, so the biolink page passes `['list', 'tiles']` and a notebook
 * preference stored on the other page never sticks there.
 */
export function useDirectoryView({
  preferred = null,
  allowed = ALL_VIEWS,
}: {
  preferred?: DirectoryView | null;
  allowed?: DirectoryView[];
} = {}) {
  const allowedKey = allowed.join(',');
  const [view, setView] = useState<DirectoryView>(preferred ?? 'list');

  // When a preferred view is supplied (deep link), it takes effect immediately —
  // no localStorage read needed and no flash of the wrong layout.
  useEffect(() => {
    if (preferred && allowed.includes(preferred)) setView(preferred);
  }, [preferred, allowed]);

  // Read once on mount (client-only, so SSR always renders the list first).
  useEffect(() => {
    if (preferred) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && allowedKey.split(',').includes(stored)) {
        setView(stored as DirectoryView);
      }
    } catch {
      // storage unavailable (private mode) — keep the default
    }
  }, [preferred, allowedKey]);

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
