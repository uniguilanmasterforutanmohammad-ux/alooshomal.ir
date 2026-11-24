import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from '@/lib/seo';

/**
 * PWA manifest. Search/AI engines and mobile browsers use it to identify the
 * site (name, language, direction, theme colour) and to offer an installable
 * app shortcut, which also strengthens the brand entity in results.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fa',
    dir: 'rtl',
    background_color: '#FFFFFF',
    theme_color: '#7C4F2E',
    categories: ['business', 'directory', 'social'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
