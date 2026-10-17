'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounced localStorage autosave for a builder form.
 *
 * Why: a user who half-fills the biolink / business-card builder and then
 * navigates away or reloads without pressing «ذخیره به‌عنوان پیش‌نویس» used to
 * lose everything. This hook mirrors the in-progress values into localStorage
 * so the next visit can offer to continue.
 *
 * It is deliberately client-only and keyed by `storageKey`:
 *   - on mount it reads the stored snapshot and exposes it via `restored`;
 *   - on every (debounced) value change it writes a fresh snapshot;
 *   - `clear()` wipes the snapshot (call it after a successful submit).
 *
 * It never touches the server; the "real" drafts still go through the API. This
 * only protects the unsaved, in-browser session.
 */
export function useFormAutosave<T>(
  storageKey: string,
  values: T,
  options?: {
    enabled?: boolean;
    delayMs?: number;
    /**
     * Only persist when this returns true. Defaults to always. Pass
     * `hasAnyValue`-style checks so an untouched (empty) form never overwrites
     * a previously saved snapshot on mount.
     */
    shouldPersist?: (values: T) => boolean;
  },
) {
  const enabled = options?.enabled ?? true;
  const delayMs = options?.delayMs ?? 800;
  // Keep the predicate in a ref so passing an inline arrow function does not
  // retrigger (and reset) the debounce timer on every parent render.
  const shouldPersistRef = useRef(options?.shouldPersist);
  shouldPersistRef.current = options?.shouldPersist;
  const [restored, setRestored] = useState<T | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  // Avoid writing before the one-time read has run, otherwise the initial
  // (empty) render would clobber a snapshot we have not loaded yet.
  const hydrated = useRef(false);

  // Read once on mount.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt?: number; values?: T };
      if (parsed && typeof parsed === 'object' && parsed.values) {
        setRestored(parsed.values);
        setRestoredAt(parsed.savedAt ?? null);
      }
    } catch {
      // A corrupt snapshot must never break the page.
    } finally {
      hydrated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // Debounced write on change.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    // Wait until the read effect finished so we don't overwrite the snapshot
    // with the blank initial state before it is loaded into the form.
    if (!hydrated.current) return;
    const shouldPersist = shouldPersistRef.current;
    if (shouldPersist && !shouldPersist(values)) return;
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: Date.now(), values }),
        );
      } catch {
        // Quota / private mode: autosave is best-effort only.
      }
    }, delayMs);
    return () => window.clearTimeout(handle);
  }, [storageKey, values, delayMs, enabled]);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setRestored(null);
    setRestoredAt(null);
  }, [storageKey]);

  return { restored, restoredAt, clear };
}

/** True when `values` contains at least one meaningful (non-empty) field. */
export function hasAnyValue(values: Record<string, unknown>): boolean {
  return Object.entries(values).some(([key, value]) => {
    // Colour/theme always have defaults; they are not "user input" by themselves.
    if (key === 'primaryColor' || key === 'template') return false;
    return typeof value === 'string' ? value.trim() !== '' : value != null;
  });
}
