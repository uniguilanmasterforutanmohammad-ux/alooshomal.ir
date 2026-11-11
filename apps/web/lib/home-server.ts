/**
 * Server-side (RSC) data for the home-page business rails.
 *
 * The public latest endpoint is already ordered by pin/recency and applies the
 * owner's plan mask, so the home page can render real, crawlable cards on the
 * first paint without a client fetch.
 */

import { SERVER_API_URL } from './site';

export interface HomeBusinessCard {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  mobile: string | null;
  phone: string | null;
  address: string | null;
  publishedAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  city: { id: string; name: string } | null;
  business: { id: string; name: string } | null;
  ownerVerified?: boolean;
}

export async function fetchHomeBusinessCards(limit = 12): Promise<HomeBusinessCard[]> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/business-cards/public/latest?limit=${limit}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data?: HomeBusinessCard[] | null;
    };
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

/**
 * Splits one latest snapshot into a recommendation rail and a freshness rail.
 * Suggestions lead with the highest-rated cards (review count and verified
 * owners break ties), while «کسب‌وکارهای تازه» is sorted by publication date
 * and excludes the cards already shown above so the two sections do not
 * repeat each other.
 */
export function splitHomeBusinessCards(items: HomeBusinessCard[]): {
  suggested: HomeBusinessCard[];
  latest: HomeBusinessCard[];
} {
  const suggested = [...items]
    .sort(
      (a, b) =>
        (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) ||
        (b.ratingCount ?? 0) - (a.ratingCount ?? 0) ||
        Number(Boolean(b.ownerVerified)) - Number(Boolean(a.ownerVerified)),
    )
    .slice(0, 4);
  const suggestedIds = new Set(suggested.map((item) => item.id));
  const newest = [...items].sort(
    (a, b) =>
      new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime(),
  );
  const latest = newest.filter((item) => !suggestedIds.has(item.id)).slice(0, 6);
  return { suggested, latest };
}
