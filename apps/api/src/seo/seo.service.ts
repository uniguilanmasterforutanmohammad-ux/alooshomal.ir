import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** One URL entry of the public XML sitemap. */
export interface SitemapEntry {
  path: string;
  lastModified: string;
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority: number;
}

/**
 * Upper bound on how many rows of each kind the sitemap endpoint returns in a
 * single response. Google tolerates large sitemaps, but keeping the payload
 * bounded protects the API and the Next.js sitemap route from a runaway query
 * once the directory grows. Raise it (and shard by page) if we ever exceed it.
 */
const MAX_ROWS = 20_000;

/**
 * Read-only helper that feeds `app/sitemap.ts` in the web app. It only exposes
 * publicly visible rows (approved + published) so the sitemap never advertises
 * a pending, rejected or unpublished page — which would otherwise look like a
 * soft-404 to crawlers.
 */
@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async sitemapEntries(): Promise<SitemapEntry[]> {
    const [biolinks, businessCards, feeds] = await Promise.all([
      this.prisma.biolink.findMany({
        where: { status: 'APPROVED', isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_ROWS,
      }),
      this.prisma.businessCard.findMany({
        where: { status: 'APPROVED', isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_ROWS,
      }),
      this.prisma.feedPost.findMany({
        where: { status: 'APPROVED', isPublished: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_ROWS,
      }),
    ]);

    const staticPages: SitemapEntry[] = [
      { path: '/', lastModified: '', changeFrequency: 'daily', priority: 1 },
      { path: '/business-cards', lastModified: '', changeFrequency: 'daily', priority: 0.9 },
      { path: '/biolinks', lastModified: '', changeFrequency: 'daily', priority: 0.9 },
      { path: '/phonebook', lastModified: '', changeFrequency: 'daily', priority: 0.8 },
      { path: '/feeds', lastModified: '', changeFrequency: 'daily', priority: 0.8 },
      { path: '/pulse', lastModified: '', changeFrequency: 'daily', priority: 0.7 },
      { path: '/services', lastModified: '', changeFrequency: 'weekly', priority: 0.7 },
      { path: '/guide', lastModified: '', changeFrequency: 'monthly', priority: 0.5 },
      { path: '/rules', lastModified: '', changeFrequency: 'monthly', priority: 0.4 },
    ];

    return [
      ...staticPages,
      ...businessCards.map((card) => ({
        path: `/business-cards/${card.slug}`,
        lastModified: card.updatedAt.toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...biolinks.map((biolink) => ({
        path: `/biolinks/${biolink.slug}`,
        lastModified: biolink.updatedAt.toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...feeds.map((post) => ({
        path: `/feeds/${post.id}`,
        lastModified: post.updatedAt.toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
    ];
  }
}
