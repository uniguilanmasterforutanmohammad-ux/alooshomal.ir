/**
 * Server-side (RSC) fetchers for the public job-category pages and the
 * behtarino-style business profile (reviews, rating, working hours).
 *
 * These run during SSR so the pages ship as crawlable HTML; the interactive
 * review form then hydrates on the client.
 */

import type {
  BusinessCategorySummary,
  BusinessReviewsPage,
  CategoryDirectoryResponse,
} from './api';
import { SERVER_API_URL } from './site';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchBusinessCategories(): Promise<
  BusinessCategorySummary[] | null
> {
  try {
    const response = await fetch(`${SERVER_API_URL}/business-categories/public`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data: BusinessCategorySummary[] | null;
    };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export interface CategorySearchParams {
  page?: string;
  cityId?: string;
  q?: string;
  sort?: string;
}

export async function fetchCategoryDirectory(
  slug: string,
  params: CategorySearchParams,
): Promise<CategoryDirectoryResponse | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/business-categories/public/${encodeURIComponent(slug)}${buildQuery({
        page: params.page,
        cityId: params.cityId,
        q: params.q,
        sort: params.sort,
      })}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data: CategoryDirectoryResponse | null;
    };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchBusinessReviews(
  slug: string,
  page = 1,
): Promise<BusinessReviewsPage | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/business-reviews/public/${encodeURIComponent(slug)}${buildQuery({
        page,
      })}`,
      { next: { revalidate: 30 } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data: BusinessReviewsPage | null;
    };
    return payload.data ?? null;
  } catch {
    return null;
  }
}
