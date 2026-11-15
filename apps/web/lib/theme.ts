'use client';

/**
 * Shared light/dark preference.
 *
 * Every `ThemeToggle` instance (the public header, the mobile bottom bar, the
 * dashboard header and the admin shell) subscribes to this module instead of
 * keeping its own `useState`. A single source of truth is what prevents the
 * classic desync where one toggle flips the page while the others still show
 * the old icon and then “toggle” to the same colour on the next click.
 */

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const listeners = new Set<() => void>();
let cached: ThemeMode | null = null;

function readPreferred(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be blocked (private mode / embedded webview); fall through
    // to the system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** The current mode. Safe to call from `useSyncExternalStore`. */
export function getThemeMode(): ThemeMode {
  if (cached === null) cached = readPreferred();
  return cached;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Apply a mode to `<html>` and remember it. `persist` is false when we are
 * only re-asserting the stored preference (e.g. after a navigation).
 */
export function applyThemeMode(next: ThemeMode, persist = true): void {
  const changed = cached !== next;
  cached = next;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', next === 'dark');
  }
  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore quota/blocked-storage errors; the DOM class is already applied.
    }
  }
  if (changed) listeners.forEach((notify) => notify());
}

/**
 * Re-assert the preference on the document. Called after every client
 * navigation and when the tab becomes visible, so a class lost by an external
 * script (or a stale build reload) cannot leave the panel in the light palette.
 */
export function syncThemeMode(): void {
  applyThemeMode(readPreferred(), false);
}
