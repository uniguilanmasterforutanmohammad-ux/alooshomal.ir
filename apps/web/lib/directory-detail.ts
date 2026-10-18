'use client';

import { useEffect, useState } from 'react';

import { api } from './api';
import type { DirectoryKind } from './directory';

/**
 * Client-side cache for the directory split-view detail payloads.
 *
 * The directory pages render a list on one side and the selected item's detail
 * on the other. Without warming, clicking a row always paid for a fresh
 * network round-trip (and a visible skeleton), which felt slow even though the
 * list itself had already been fetched.
 *
 * The cache is primed in batches as each list page arrives (see
 * `primeDirectoryDetails`): one request carries the slugs of a whole page, so by
 * the time the visitor clicks a row its detail is already in memory and paints
 * on the next frame. The same pending promise is shared by every consumer, so
 * clicking before the batch lands only waits for that in-flight request instead
 * of firing a duplicate one.
 */

/** How many slugs to pack into one batch request (the API caps at 50). */
const BATCH_SIZE = 25;

/** Freshly fetched payloads, keyed by `kind:slug`. */
const cache = new Map<string, unknown>();

/** In-flight payloads, keyed the same way, so callers can await a warm-up. */
const pending = new Map<string, Promise<unknown>>();

function keyFor(kind: DirectoryKind, slug: string): string {
  return `${kind}:${slug}`;
}

/** A primed detail payload, or `null` when it is not cached yet. */
export function getCachedDirectoryDetail<T>(
  kind: DirectoryKind,
  slug: string,
): T | null {
  const value = cache.get(keyFor(kind, slug));
  return value === undefined ? null : (value as T);
}

/**
 * Loads one row's public detail, reusing the cache and any in-flight request.
 * The single-slug endpoints wrap the row in an asset envelope
 * (`{ biolink | businessCard, qr, link }`); only the row is cached so the batch
 * and single paths share one shape.
 */
function loadDirectoryDetail<T>(kind: DirectoryKind, slug: string): Promise<T> {
  const key = keyFor(kind, slug);
  const cached = cache.get(key);
  if (cached !== undefined) return Promise.resolve(cached as T);
  const existing = pending.get(key);
  // A batch warm-up claims this slug *before* it has a row, so wait for the
  // claim to settle and then re-read the cache; only if it produced nothing do
  // we fall through to the single-slug request.
  if (existing) {
    return existing.then(() => {
      const after = cache.get(key);
      if (after !== undefined) return after as T;
      return fetchDirectoryDetail<T>(kind, slug);
    });
  }

  return fetchDirectoryDetail<T>(kind, slug);
}

/** Single-slug request used when no batch warm-up produced the row. */
function fetchDirectoryDetail<T>(kind: DirectoryKind, slug: string): Promise<T> {
  const key = keyFor(kind, slug);
  const cached = cache.get(key);
  if (cached !== undefined) return Promise.resolve(cached as T);
  const existing = pending.get(key);
  if (existing) return existing.then(() => fetchDirectoryDetail<T>(kind, slug));

  const request = api
    .get<T | { biolink?: T; businessCard?: T }>(
      `/${kind}/public/${encodeURIComponent(slug)}`,
    )
    .then((result) => {
      const row =
        (result as { biolink?: T }).biolink ??
        (result as { businessCard?: T }).businessCard ??
        (result as T);
      cache.set(key, row);
      return row;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  return request;
}

/**
 * Fetches the details of a whole page of rows in a handful of batched requests
 * and stores them under their slugs. Already-cached or in-flight slugs are
 * skipped, so scrolling back over a page never re-fetches it.
 */
export function primeDirectoryDetails(
  kind: DirectoryKind,
  slugs: Array<string | null | undefined>,
): void {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const key = keyFor(kind, slug);
    if (cache.has(key) || pending.has(key)) continue;
    missing.push(slug);
  }
  if (missing.length === 0) return;

  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    const chunk = missing.slice(index, index + BATCH_SIZE);
    // Claim the chunk up front so a concurrent prime/click doesn't duplicate
    // it; each request resolves to nothing but populates the shared cache.
    let resolveChunk: () => void = () => {};
    const claim = new Promise<void>((resolve) => {
      resolveChunk = resolve;
    });
    for (const slug of chunk) pending.set(keyFor(kind, slug), claim);

    const query = chunk.map((slug) => encodeURIComponent(slug)).join(',');
    api
      .get<Array<{ slug: string }>>(`/${kind}/public/batch?slugs=${query}`)
      .then((items) => {
        for (const item of items ?? []) {
          if (!item?.slug) continue;
          cache.set(keyFor(kind, item.slug), item);
        }
      })
      .catch(() => {
        // A failed warm-up must never break the list; the per-row fetch in
        // `useDirectoryDetail` still covers the click.
      })
      .finally(() => {
        for (const slug of chunk) {
          // Only clear entries this chunk still owns (a click may have swapped
          // in its own single-slug promise meanwhile).
          if (pending.get(keyFor(kind, slug)) === claim) {
            pending.delete(keyFor(kind, slug));
          }
        }
        resolveChunk();
      });
  }
}

/**
 * Resolves the detail payload for one row, instantly when the batch warm-up has
 * already landed. Loading is only ever true while a request is genuinely in
 * flight, so a primed row never shows a skeleton.
 */
export function useDirectoryDetail<T>(
  kind: DirectoryKind,
  slug: string,
): { item: T | null; loading: boolean; error: string | null } {
  const [item, setItem] = useState<T | null>(() =>
    getCachedDirectoryDetail<T>(kind, slug),
  );
  const [loading, setLoading] = useState(
    () => getCachedDirectoryDetail<T>(kind, slug) === null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const cached = getCachedDirectoryDetail<T>(kind, slug);
    if (cached) {
      setItem(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setItem(null);
    setLoading(true);
    setError(null);
    loadDirectoryDetail<T>(kind, slug)
      .then((row) => {
        if (!active) return;
        setItem(row);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [kind, slug]);

  return { item, loading, error };
}
