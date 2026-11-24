/**
 * Central SEO / AI-discoverability constants and JSON-LD builders.
 *
 * Search engines and AI answer engines (Google, Bing, ChatGPT, Perplexity,
 * Claude…) all read the same structured data. Keeping the site identity in one
 * module means the root layout, breadcrumbs and page-level graphs never drift
 * apart (a mismatched `@id` silently breaks entity linking).
 */

import { absoluteUrl, SITE_URL } from './site';

export const SITE_NAME = 'شمالی کارت';
export const SITE_SHORT_NAME = 'شمالی کارت';
export const SITE_ALTERNATE_NAME = 'Shomali Card';
export const SITE_TAGLINE = 'کارت ویزیت دیجیتال و بیولینک کسب‌وکارهای شمال';
export const SITE_DESCRIPTION =
  'پلتفرم ساخت کارت ویزیت دیجیتال و بیولینک برای کسب‌وکارهای شمال ایران؛ دفترچه تلفن، دسته‌بندی مشاغل، اخبار شهر، بلاگ و فروشگاه‌های محلی — مشاهده بدون نصب برنامه.';

export const SITE_KEYWORDS = [
  'کارت ویزیت دیجیتال',
  'بیولینک',
  'شمالی کارت',
  'دفترچه تلفن شمال',
  'کسب‌وکارهای شمال',
  'دسته‌بندی مشاغل',
  'تنکابن',
  'شیرود',
  'رامسر',
  'مازندران',
  'اقامتگاه اجاره‌ای',
  'فروشگاه آنلاین محلی',
];

export const SITE_EMAIL = 'support@shomalicard.ir';
export const SITE_PHONE = '+989207818389';
export const SITE_PHONE_DISPLAY = '۰۹۲۰۷۸۱۸۳۸۹';
export const SITE_AREA_SERVED = ['تنکابن', 'شیرود', 'رامسر', 'مازندران'];

/** Stable `@id` anchors so pages can reference the same entities. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LOGO_URL = absoluteUrl('/shomali-card-calligraphy.svg');

/** The public directory search endpoint, used for `SearchAction`. */
export const SITE_SEARCH_URL = `${absoluteUrl('/business-cards')}?q={search_term_string}`;

/** `Organization` node shared by every page graph. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
    },
    description: SITE_DESCRIPTION,
    email: SITE_EMAIL,
    telephone: SITE_PHONE,
    areaServed: SITE_AREA_SERVED.map((name) => ({
      '@type': 'AdministrativeArea',
      name,
    })),
    knowsLanguage: ['fa-IR'],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SITE_EMAIL,
        telephone: SITE_PHONE,
        availableLanguage: ['fa'],
      },
    ],
  };
}

/** `WebSite` node (with sitelinks search box) shared by every page graph. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'fa-IR',
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: SITE_SEARCH_URL,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Full site-wide `@graph` injected once in the root layout. */
export function siteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd(), websiteJsonLd()],
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path, e.g. `/categories`. Omit for the current page. */
  path?: string;
}

/** `BreadcrumbList` node matching the visible breadcrumb of a page. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/** `CollectionPage` + `ItemList` node for directory/listing pages. */
export function collectionJsonLd(options: {
  name: string;
  description?: string;
  path: string;
  items: Array<{ name: string; path: string }>;
  total?: number;
  breadcrumbs?: BreadcrumbItem[];
}): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'CollectionPage',
      name: options.name,
      ...(options.description ? { description: options.description } : {}),
      url: absoluteUrl(options.path),
      inLanguage: 'fa-IR',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: options.total ?? options.items.length,
        itemListElement: options.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(item.path),
          name: item.name,
        })),
      },
    },
  ];
  if (options.breadcrumbs?.length) {
    graph.push(breadcrumbJsonLd(options.breadcrumbs));
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
