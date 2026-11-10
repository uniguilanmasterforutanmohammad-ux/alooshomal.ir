import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, ChevronLeft } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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

        <h2 className="mt-8 mb-3 text-lg font-extrabold text-ink">
          دسته‌بندی‌های دارای کسب‌وکار
        </h2>
        {withBusinesses.length === 0 ? (
          <div className="indeed-panel p-8 text-center text-sm text-muted">
            هنوز کسب‌وکاری در دسته‌بندی‌ها منتشر نشده است.
          </div>
        ) : (
          <ul className="categories-grid">
            {withBusinesses.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${encodeURIComponent(category.name)}`}
                  className="category-card"
                >
                  <span className="category-card-icon">
                    <BriefcaseBusiness className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold text-ink">
                      {category.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {fa(category.count)} کسب‌وکار
                    </span>
                  </span>
                  <ArrowLeft className="size-4 shrink-0 text-brand" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {withoutBusinesses.length > 0 ? (
          <details className="mt-8 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4">
            <summary className="cursor-pointer text-sm font-bold text-ink">
              سایر دسته‌بندی‌ها ({fa(withoutBusinesses.length)})
            </summary>
            <ul className="mt-3 flex flex-wrap gap-2">
              {withoutBusinesses.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${encodeURIComponent(category.name)}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--vintage-border)] px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
