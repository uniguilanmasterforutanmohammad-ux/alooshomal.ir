/**
 * Server-side (RSC) fetchers for the public job-category pages and the
 * behtarino-style business profile (reviews, rating, working hours).
 *
 * These run during SSR so the pages ship as crawlable HTML; the interactive
 * review form then hydrates on the client.
 */

import type {
  AccommodationProperty,
  BusinessCategorySummary,
  BusinessReviewsPage,
  CategoryDirectoryResponse,
  PublicAccommodationFacets,
  PublicProduct,
  PublicProductFacets,
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

// ---------------------------------------------------------------------------
//  Business-management public directories (`/stay` and `/shop`)
// ---------------------------------------------------------------------------

export interface StayDirectoryParams {
  q?: string;
  cityId?: string;
  type?: string;
  guests?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

/** Accommodation directory listing (`GET /public/accommodations`). */
export async function fetchStayDirectory(
  params: StayDirectoryParams,
): Promise<AccommodationProperty[]> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/accommodations${buildQuery({ ...params })}`,
      { next: { revalidate: 30 } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data: AccommodationProperty[] | null;
    };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

/** Filter options (cities/types) of the accommodation directory. */
export async function fetchStayFacets(): Promise<PublicAccommodationFacets> {
  const empty: PublicAccommodationFacets = { cities: [], types: [] };
  try {
    const response = await fetch(`${SERVER_API_URL}/public/accommodations/filters`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return empty;
    const payload = (await response.json()) as {
      data: PublicAccommodationFacets | null;
    };
    return payload.data ?? empty;
  } catch {
    return empty;
  }
}

export interface ShopDirectoryParams {
  q?: string;
  shop?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

/** Product directory listing (`GET /public/products`). */
export async function fetchProductDirectory(
  params: ShopDirectoryParams,
): Promise<PublicProduct[]> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/products${buildQuery({ ...params })}`,
      { next: { revalidate: 30 } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data: PublicProduct[] | null;
    };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

/** Filter options (categories/shops) of the product directory. */
export async function fetchProductFacets(): Promise<PublicProductFacets> {
  const empty: PublicProductFacets = { categories: [], shops: [] };
  try {
    const response = await fetch(`${SERVER_API_URL}/public/products/facets`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return empty;
    const payload = (await response.json()) as {
      data: PublicProductFacets | null;
    };
    return payload.data ?? empty;
  } catch {
    return empty;
  }
}
