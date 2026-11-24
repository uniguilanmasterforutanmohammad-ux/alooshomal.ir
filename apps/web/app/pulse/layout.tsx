import type { Metadata } from 'next';

/**
 * Route-level metadata for the client-rendered `/pulse` news timeline (a
 * client page cannot export `metadata` itself).
 */
export const metadata: Metadata = {
  title: 'اخبار شهر — نبض شمال',
  description:
    'تازه‌ترین خبرهای تأییدشده‌ی شهروندخبرنگاران تنکابن، شیرود و رامسر؛ رویدادها، خدمات شهری و اخبار محلی در شمالی کارت.',
  alternates: { canonical: '/pulse' },
};

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
