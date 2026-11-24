import type { Metadata, Viewport } from 'next';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { FeatureNoticeBar } from '@/components/layout/FeatureNoticeBar';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { SupportChatWidget } from '@/components/support/SupportChatWidget';
import { SessionWatcher } from '@/components/ui/SessionWatcher';
import { ChunkErrorReloader } from '@/components/ui/ChunkErrorReloader';
import { PaypingOAuthCatcher } from '@/components/admin/PaypingOAuthCatcher';
import { MobileNav } from '@/components/layout/MobileNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_URL } from '@/lib/site';
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  siteJsonLd,
} from '@/lib/seo';
import {
  getSiteTheme,
  siteThemeDocumentAttrs,
  siteThemeThemeColor,
} from '@/lib/site-theme';
import { getPublicFeatureSnapshot } from '@/lib/sections-server';
import { FeaturesProvider } from '@/components/layout/FeaturesProvider';
import './globals.css';

import { ThemeScript } from '@/components/ui/ThemeScript';
import { ThemeSync } from '@/components/ui/ThemeSync';




export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'کسب‌وکار و خدمات محلی',
  alternates: {
    canonical: '/',
    languages: { 'fa-IR': '/' },
    // Advertise the machine-readable LLM index to AI crawlers.
    types: {
      'text/plain': '/llms.txt',
      'application/rss+xml': '/blog/rss.xml',
    },
  },
  // Let the browser render phone numbers/addresses as plain text instead of
  // auto-linking them (auto-links add noise for crawlers and break layout).
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export async function generateViewport(): Promise<Viewport> {
  // Match the browser chrome to the active site theme.
  const theme = await getSiteTheme();
  return {
    themeColor: siteThemeThemeColor(theme),
    width: 'device-width',
    initialScale: 1,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Admin-chosen site-wide design; written on <html> so it applies before paint.
  const siteTheme = await getSiteTheme();
  const { theme: layoutTheme, skin } = siteThemeDocumentAttrs(siteTheme);
  // Public feature switches, read once on the server. Seeding the shared store
  // lets the server-rendered header omit disabled sections from the very first
  // paint; the same snapshot is serialized below so the client's first render
  // matches (no hydration mismatch / flash).
  const features = await getPublicFeatureSnapshot();

  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={layoutTheme}
      data-skin={skin ?? undefined}
      suppressHydrationWarning
    >
      <body>
        {/* Site-wide entity graph (Organization + WebSite + SearchAction) so
            every page links to the same brand entity for search/AI engines. */}
        <JsonLd data={siteJsonLd()} />
        <FeaturesProvider initial={features}>
          <ThemeScript />
          <ThemeSync />
          {/* The hero text (the LCP element) is painted in Shabnam, which is
              otherwise only discovered after the render-blocking CSS arrives —
              that discovery delay was ~76% of the LCP time on throttled
              desktop. React hoists these into <head>, so the two faces used
              above the fold download in parallel with the CSS instead of after
              it. */}
          <link
            rel="preload"
            href="/fonts/shabnam/Shabnam.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/shabnam/Shabnam-Bold.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <OfflineBanner />
          <FeatureNoticeBar />
          {children}
          <SessionWatcher />
          <ChunkErrorReloader />
          <PaypingOAuthCatcher />
          <MobileNav />
          <SupportChatWidget />
          <ToastViewport />
        </FeaturesProvider>
      </body>
    </html>
  );
}
