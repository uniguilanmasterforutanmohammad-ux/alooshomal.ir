import type { Metadata } from 'next';

/**
 * Route-level metadata for the client-rendered `/feeds` stream (a client page
 * cannot export `metadata` itself).
 */
export const metadata: Metadata = {
  title: 'پست‌ها و جریان کسب‌وکارهای شمال',
  description:
    'جریان تازه‌ترین پست‌های کوتاه کسب‌وکارها و کاربران شمالی کارت؛ پیشنهادها، تخفیف‌ها و اطلاعیه‌های محلی.',
  alternates: { canonical: '/feeds' },
};

export default function FeedsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
