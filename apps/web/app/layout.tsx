import type { Metadata, Viewport } from 'next';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { MobileNav } from '@/components/layout/MobileNav';
import { SessionWatcher } from '@/components/ui/SessionWatcher';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'آلوشمال | بیولینک دیجیتال',
    template: '%s | آلوشمال',
  },
  description:
    'پلتفرم ساخت، شخصی‌سازی و اشتراک‌گذاری بیولینک دیجیتال؛ مشاهده بدون نصب برنامه.',
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
