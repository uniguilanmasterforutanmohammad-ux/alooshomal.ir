import type { Metadata, Viewport } from 'next';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { FeatureNoticeBar } from '@/components/layout/FeatureNoticeBar';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { MobileNav } from '@/components/layout/MobileNav';
import { SessionWatcher } from '@/components/ui/SessionWatcher';
import { SITE_URL } from '@/lib/site';
import './globals.css';

import { ThemeScript } from '@/components/ui/ThemeScript';




export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'شمالی کارت | بیولینک دیجیتال',
    template: '%s | شمالی کارت',
  },
  description:
    'پلتفرم ساخت، شخصی‌سازی و اشتراک‌گذاری بیولینک دیجیتال؛ مشاهده بدون نصب برنامه.',
  applicationName: 'شمالی کارت',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'شمالی کارت',
    title: 'شمالی کارت | بیولینک دیجیتال',
    description:
      'پلتفرم ساخت، شخصی‌سازی و اشتراک‌گذاری بیولینک و کارت ویزیت دیجیتال؛ مشاهده بدون نصب برنامه.',
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'شمالی کارت | بیولینک دیجیتال',
    description:
      'پلتفرم ساخت، شخصی‌سازی و اشتراک‌گذاری بیولینک و کارت ویزیت دیجیتال.',
  },
};

export const viewport: Viewport = {
  themeColor: '#F2E8D9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {/* The hero text (the LCP element) is painted in Shabnam, which is
            otherwise only discovered after the render-blocking CSS arrives —
            that discovery delay was ~76% of the LCP time on throttled desktop.
            React hoists these into <head>, so the two faces used above the
            fold download in parallel with the CSS instead of after it. */}
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
        <MobileNav />
        <ToastViewport />
      </body>
    </html>
  );
}
