/**
 * Server-side (RSC) fetchers for the public directories.
 *
 * These run during SSR so the very first page of `/business-cards`, `/biolinks`
 * and `/feeds` ships as real HTML — with crawlable `<a href>` links and business
 * content — instead of a client-rendered shell. Google bots do not scroll or
 * click "load more", so the server-rendered first page is what makes the
 * directory indexable; the interactive client list takes over after hydration
 * and keeps infinite scroll / pagination / the split detail view working.
 *
 * The viewer-specific `liked`/`saved` flags are always false here (there is no
 * visitor cookie on the server); the client reconciles them on mount.
 */

import type {
  DirectoryBusinessCard,
  DirectoryFacet,
  DirectoryBiolink,
  FeedPost,
  FeedTopic,
  PhonebookEntry,
} from './api';
import { SERVER_API_URL } from './site';

export interface DirectoryMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ServerDirectoryResult<T, F> {
  items: T[];
  meta: DirectoryMeta;
  filters: F;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function fetchDirectory<T, F>(
  path: string,
  params: Record<string, string | undefined>,
): Promise<ServerDirectoryResult<T, F> | null> {
  try {
    const response = await fetch(`${SERVER_API_URL}${path}${buildQuery(params)}`, {
      // Short revalidation keeps the SSR snapshot fresh without hammering the
      // API on every crawler hit; the client always refreshes on mount anyway.
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data: ServerDirectoryResult<T, F> | null;
    };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export interface DirectorySearchParams {
  q?: string;
  cityId?: string;
  businessId?: string;
  sort?: string;
}

export function fetchBusinessCardsDirectory(params: DirectorySearchParams) {
  return fetchDirectory<
    DirectoryBusinessCard,
    { cities: DirectoryFacet[]; businesses: DirectoryFacet[] }
  >('/business-cards/public', { ...params, page: '1' });
}

export function fetchBiolinksDirectory(params: DirectorySearchParams) {
  return fetchDirectory<
    DirectoryBiolink,
    { cities: DirectoryFacet[]; businesses: DirectoryFacet[] }
  >('/biolinks/public', { ...params, page: '1' });
}

export function fetchFeedsDirectory(params: { q?: string; topicId?: string }) {
  return fetchDirectory<FeedPost, { topics: FeedTopic[] }>('/feeds/public', {
    ...params,
    page: '1',
  });
}

/**
 * Server-side (RSC) fetch of the first «دفترچه تلفن» page. The endpoint is
 * paginated (the client keeps infinite scroll on top of it); this seeds the
 * first paint with the real contact rows for crawlers and a flash-free first
 * render.
 */
export function fetchPhonebook(params: { q?: string; sort?: string } = {}) {
  return fetchDirectory<PhonebookEntry, Record<string, never>>(
    '/business-cards/public/phonebook',
    { ...params, page: '1' },
  );
}
