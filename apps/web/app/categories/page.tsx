import type { Metadata } from 'next';
import Link from 'next/link';
import { BriefcaseBusiness, ChevronLeft } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PopularCategories } from '@/components/category/PopularCategories';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { fetchBusinessCategories } from '@/lib/catalog-server';
import { fa } from '@/lib/jalali';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

export const metadata: Metadata = {
  title: 'دسته‌بندی مشاغل — بهترین کسب‌وکارهای شمال',
  description:
    'فهرست دسته‌بندی‌های شغلی شمالی کارت: داروخانه، رستوران، پزشکی، ساختمان، فناوری و ده‌ها دسته‌ی دیگر. کسب‌وکار مناسب را با امتیاز و دیدگاه کاربران پیدا کنید.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/categories')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="دسته‌بندی مشاغل" />
      </>
    );
  }
  const categories = (await fetchBusinessCategories()) ?? [];
  const withBusinesses = categories.filter((category) => category.count > 0);
  const withoutBusinesses = categories.filter((category) => category.count === 0);

  return (
    <div className="min-h-screen bg-soft">
      <Header />
      <main className="container-page py-6 sm:py-10">
        <nav aria-label="مسیر صفحه" className="mb-4 flex items-center gap-1 text-xs text-muted">
          <Link href="/" className="hover:text-brand">
            خانه
          </Link>
          <ChevronLeft className="size-3.5" aria-hidden />
          <span className="font-bold text-ink">دسته‌بندی مشاغل</span>
        </nav>

        <section className="categories-hero">
          <div className="categories-hero-icon">
            <BriefcaseBusiness className="size-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-ink sm:text-3xl">
              دسته‌بندی مشاغل
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              کسب‌وکار موردنظرتان را بر اساس شغل پیدا کنید؛ هر دسته شامل اطلاعات
              تماس، آدرس، ساعات کاری، امتیاز و دیدگاه کاربران است.
            </p>
          </div>
          <span className="categories-hero-count">
            {fa(withBusinesses.length)} دسته فعال
          </span>
        </section>

        {withBusinesses.length === 0 ? (
          <div className="indeed-panel mt-8 p-8 text-center text-sm text-muted">
            هنوز کسب‌وکاری در دسته‌بندی‌ها منتشر نشده است.
          </div>
        ) : (
          <div className="mt-8">
            <PopularCategories
              categories={withBusinesses}
              title="دسته‌بندی‌های دارای کسب‌وکار"
              moreHref={null}
              showCounts
            />
          </div>
        )}

        {withoutBusinesses.length > 0 ? (
          <div className="mt-8">
            <PopularCategories
              categories={withoutBusinesses}
              title="سایر دسته‌بندی‌ها"
              moreHref={null}
              showCounts
            />
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
