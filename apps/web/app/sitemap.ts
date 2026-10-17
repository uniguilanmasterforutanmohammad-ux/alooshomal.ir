import type { MetadataRoute } from 'next';

import { absoluteUrl, SERVER_API_URL } from '@/lib/site';

interface SitemapEntry {
  path: string;
  lastModified: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

/**
 * Live XML sitemap. The card/biolink/feed URLs come from the API
 * (`GET /seo/sitemap`, which only returns published + approved rows) so the
 * sitemap never advertises a pending or deleted page. Revalidated hourly: the
 * directory does not change second-to-second, and this keeps the origin cheap.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  async function loadEntries(): Promise<SitemapEntry[]> {
    try {
      const response = await fetch(`${SERVER_API_URL}/seo/sitemap`, {
        next: { revalidate },
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as { data: SitemapEntry[] };
      return payload.data ?? [];
    } catch {
      return [];
    }
  }

  const entries = await loadEntries();
  const now = new Date();

  return entries.map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: entry.lastModified ? new Date(entry.lastModified) : now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
