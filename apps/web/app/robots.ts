import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

/**
 * robots.txt. Private areas (dashboard, admin, auth and the API/proxy) are
 * disallowed so crawlers spend their budget on the public directory, while the
 * sitemap is advertised for fast discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/api/',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
