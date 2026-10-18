import type { Metadata, Viewport } from 'next';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { MobileNav } from '@/components/layout/MobileNav';
import { SessionWatcher } from '@/components/ui/SessionWatcher';
import { SITE_URL } from '@/lib/site';
import './globals.css';

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
    <html lang="fa" dir="rtl">
      <body>
        <OfflineBanner />
        {children}
        <SessionWatcher />
        <MobileNav />
        <ToastViewport />
      </body>
    </html>
  );
}
