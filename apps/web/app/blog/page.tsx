import type { Metadata } from 'next';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { BlogIndex } from '@/components/blog/BlogIndex';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

export const metadata: Metadata = {
  title: 'بلاگ',
  description:
    'مقالات، آموزش‌ها و ویدیوهای آپارات درباره‌ی کارت ویزیت دیجیتال، بیولینک و کسب‌وکار محلی.',
  alternates: { canonical: '/blog' },
};

/**
 * «بلاگ» index. Renders a friendly disabled screen when the admin stops the
 * blog section (its «نمایش» switch), matching the other public sections.
 */
export default async function BlogPage() {
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/blog')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="بلاگ" />
      </>
    );
  }
  return (
    <>
      <Header />
      <BlogIndex />
      <Footer />
    </>
  );
}
