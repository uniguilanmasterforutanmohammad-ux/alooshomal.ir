/**
 * Minimal RSS 2.0 builder shared by the blog and city-news feeds.
 *
 * RSS is still the cheapest way for aggregators and AI/news crawlers to poll
 * fresh content, and it costs one small route per section.
 */

import { absoluteUrl } from './site';

export interface RssItem {
  title: string;
  /** Site-relative path, e.g. `/blog/my-post`. */
  path: string;
  description?: string | null;
  publishedAt?: string | null;
  guid?: string;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clean(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRss(options: {
  title: string;
  description: string;
  /** Site-relative path of the section, e.g. `/blog`. */
  path: string;
  items: RssItem[];
}): string {
  const channelUrl = absoluteUrl(options.path);
  const items = options.items
    .map((item) => {
      const link = absoluteUrl(item.path);
      const description = clean(item.description);
      const pubDate = item.publishedAt ? new Date(item.publishedAt) : null;
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.guid ?? link)}</guid>`,
        ...(description ? [`      <description>${escapeXml(description)}</description>`] : []),
        ...(pubDate && !Number.isNaN(pubDate.getTime())
          ? [`      <pubDate>${pubDate.toUTCString()}</pubDate>`]
          : []),
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(channelUrl)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    '    <language>fa-IR</language>',
    `    <atom:link href="${escapeXml(absoluteUrl(`${options.path}/rss.xml`))}" rel="self" type="application/rss+xml"/>`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    '    <generator>شمالی کارت</generator>',
    ...(items ? [items] : []),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/** Shared response headers for the XML feeds. */
export const RSS_HEADERS = {
  'Content-Type': 'application/rss+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=1800, s-maxage=1800',
} as const;

