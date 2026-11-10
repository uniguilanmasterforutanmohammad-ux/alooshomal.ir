import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronLeft,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { RatingStars } from '@/components/business/RatingStars';
import { fetchBusinessCategories, fetchCategoryDirectory } from '@/lib/catalog-server';
import { fa } from '@/lib/jalali';
import { jsonLdHtml } from '@/lib/json-ld';
import {
  absoluteUrl,
  decodeSlugParam,
  metaDescription,
} from '@/lib/site';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    cityId?: string;
    q?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'recent', label: 'جدیدترین' },
  { value: 'rating', label: 'بالاترین امتیاز' },
  { value: 'liked', label: 'محبوب‌ترین' },
  { value: 'alpha', label: 'الفبایی' },
];

function categoryPath(name: string): string {
  return `/categories/${encodeURIComponent(name)}`;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = decodeSlugParam(slug);
  const data = await fetchCategoryDirectory(name, {});
  if (!data) {
    return { title: 'دسته‌بندی پیدا نشد', robots: { index: false, follow: false } };
  }
  const categoryName = data.category.name;
  const title = `بهترین کسب‌وکارهای ${categoryName} در شمال — آدرس، تلفن و دیدگاه`;
  const description = metaDescription(
    null,
    `فهرست ${data.category.count.toLocaleString('fa-IR')} کسب‌وکار فعال در دسته «${categoryName}» با شماره تماس، آدرس، امتیاز و دیدگاه کاربران در شمالی کارت.`,
  );
  return {
    title,
    description,
    alternates: { canonical: categoryPath(categoryName) },
    openGraph: { title, description, url: categoryPath(categoryName) },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const name = decodeSlugParam(slug);
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/categories')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="دسته‌بندی مشاغل" />
      </>
    );
  }

  const [data, allCategories] = await Promise.all([
    fetchCategoryDirectory(name, sp),
    fetchBusinessCategories(),
  ]);
  if (!data) notFound();

  const { category, items, meta, filters } = data;
  const currentQuery = { q: sp.q, cityId: sp.cityId, sort: sp.sort };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `کسب‌وکارهای ${category.name}`,
    url: absoluteUrl(categoryPath(category.name)),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: meta.total,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: (meta.page - 1) * meta.limit + index + 1,
        url: absoluteUrl(`/business/${item.slug}`),
        name: item.fullName,
      })),
    },
  };
  const related = (allCategories ?? [])
    .filter((entry) => entry.name !== category.name && entry.count > 0)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-soft">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <Header />
      <main className="container-page py-6 sm:py-8">
        <nav aria-label="مسیر صفحه" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
          <Link href="/" className="hover:text-brand">
            خانه
          </Link>
          <ChevronLeft className="size-3.5" aria-hidden />
          <Link href="/categories" className="hover:text-brand">
            دسته‌بندی مشاغل
          </Link>
          <ChevronLeft className="size-3.5" aria-hidden />
          <span className="font-bold text-ink">{category.name}</span>
        </nav>

        <section className="category-head">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-brand">دسته‌بندی مشاغل</p>
            <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">
              کسب‌وکارهای {category.name}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              {fa(category.count)} کسب‌وکار ثبت‌شده در این دسته — با شماره تماس،
              آدرس، امتیاز و دیدگاه کاربران.
            </p>
          </div>
          <Link href="/categories" className="indeed-btn indeed-btn-secondary shrink-0">
            همه دسته‌بندی‌ها
          </Link>
        </section>

        <div className="category-layout">
          <div className="min-w-0">
            <div className="category-toolbar">
              <form action={categoryPath(category.name)} method="get" className="category-search">
                {sp.cityId ? <input type="hidden" name="cityId" value={sp.cityId} /> : null}
                {sp.sort ? <input type="hidden" name="sort" value={sp.sort} /> : null}
                <Search className="size-4 shrink-0 text-muted" aria-hidden />
                <input
                  name="q"
                  defaultValue={sp.q}
                  placeholder={`جستجو در ${category.name}…`}
                  aria-label="جستجو در این دسته"
                />
                <button type="submit" className="indeed-btn indeed-btn-primary py-1.5 text-xs">
                  جستجو
                </button>
              </form>
              <div className="category-sorts" aria-label="ترتیب نمایش">
                <span className="flex items-center gap-1 text-xs font-bold text-muted">
                  <SlidersHorizontal className="size-3.5" aria-hidden />
                  ترتیب:
                </span>
                {SORT_OPTIONS.map((option) => {
                  const active = (sp.sort ?? 'recent') === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={`${categoryPath(category.name)}${buildQuery({
                        ...currentQuery,
                        sort: option.value,
                        page: undefined,
                      })}`}
                      className={active ? 'category-chip category-chip-active' : 'category-chip'}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {filters.cities.length > 0 ? (
              <div className="category-cities" aria-label="فیلتر شهر">
                <Link
                  href={`${categoryPath(category.name)}${buildQuery({
                    ...currentQuery,
                    cityId: undefined,
                    page: undefined,
                  })}`}
                  className={!sp.cityId ? 'category-chip category-chip-active' : 'category-chip'}
                >
                  همه شهرها
                </Link>
                {filters.cities.map((city) => (
                  <Link
                    key={city.id}
                    href={`${categoryPath(category.name)}${buildQuery({
                      ...currentQuery,
                      cityId: city.id,
                      page: undefined,
                    })}`}
                    className={
                      sp.cityId === city.id
                        ? 'category-chip category-chip-active'
                        : 'category-chip'
                    }
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="indeed-panel p-8 text-center">
                <Building2 className="mx-auto size-9 text-[var(--vintage-border)]" aria-hidden />
                <p className="mt-3 font-bold text-ink">کسب‌وکاری با این فیلترها پیدا نشد.</p>
                <p className="mt-1 text-sm text-muted">
                  فیلتر شهر یا عبارت جستجو را تغییر دهید.
                </p>
              </div>
            ) : (
              <ol className="category-results">
                {items.map((item, index) => {
                  const profileHref = `/business/${item.slug}`;
                  const rating = item.ratingAvg ?? 0;
                  const ratingCount = item.ratingCount ?? 0;
                  return (
                    <li key={item.id} className="category-result">
                      <span className="category-result-rank">
                        {fa((meta.page - 1) * meta.limit + index + 1)}
                      </span>
                      <div className="category-result-media">
                        {item.logoUrl || item.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.logoUrl || item.avatarUrl || ''}
                            alt={item.fullName}
                            loading="lazy"
                          />
                        ) : (
                          <span>{item.fullName.trim().slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={profileHref}
                            className="text-base font-extrabold text-ink hover:text-brand"
                          >
                            {item.fullName}
                          </Link>
                          {item.ownerVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              <BadgeCheck className="size-3" aria-hidden />
                              تأیید هویت
                            </span>
                          ) : null}
                          {item.adDirectoryUntil ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              تبلیغات
                            </span>
                          ) : null}
                        </div>
                        {item.jobTitle || item.company ? (
                          <p className="mt-0.5 text-sm text-muted">
                            {[item.jobTitle, item.company].filter(Boolean).join(' — ')}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {ratingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-ink">
                              <RatingStars rating={rating} hideValue className="size-3.5" />
                              <span>
                                {rating.toLocaleString('fa-IR')} ({fa(ratingCount)} نفر)
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted">
                              <Star className="size-3.5" aria-hidden />
                              بدون دیدگاه
                            </span>
                          )}
                          {item.city?.name ? (
                            <span className="text-muted">{item.city.name}</span>
                          ) : null}
                        </div>
                        {item.bio ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                            {item.bio}
                          </p>
                        ) : null}
                        {item.address ? (
                          <p className="mt-2 flex items-start gap-1 text-xs leading-6 text-muted">
                            <MapPin className="mt-1 size-3.5 shrink-0 text-brand" aria-hidden />
                            <span className="line-clamp-2">{item.address}</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="category-result-actions">
                        {item.phone || item.mobile ? (
                          <a
                            href={`tel:${(item.mobile || item.phone || '').replace(/\s/g, '')}`}
                            className="indeed-btn indeed-btn-primary py-1.5 text-xs"
                          >
                            <Phone className="size-3.5" aria-hidden />
                            تماس
                          </a>
                        ) : null}
                        <Link
                          href={profileHref}
                          className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                        >
                          جزئیات
                          <ArrowLeft className="size-3.5" aria-hidden />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {meta.totalPages > 1 ? (
              <nav className="category-pagination" aria-label="صفحه‌بندی">
                {meta.hasPrev ? (
                  <Link
                    href={`${categoryPath(category.name)}${buildQuery({
                      ...currentQuery,
                      page: String(meta.page - 1),
                    })}`}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    صفحه قبل
                  </Link>
                ) : null}
                <span className="text-xs text-muted">
                  صفحه {fa(meta.page)} از {fa(meta.totalPages)}
                </span>
                {meta.hasNext ? (
                  <Link
                    href={`${categoryPath(category.name)}${buildQuery({
                      ...currentQuery,
                      page: String(meta.page + 1),
                    })}`}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    صفحه بعد
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>

          <aside className="category-aside">
            <div className="indeed-panel p-4">
              <h2 className="text-sm font-extrabold text-ink">دسته‌بندی‌های دیگر</h2>
              <ul className="mt-3 space-y-1.5">
                {related.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={categoryPath(entry.name)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-soft hover:text-brand"
                    >
                      <span className="truncate">{entry.name}</span>
                      <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[10px]">
                        {fa(entry.count)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="category-aside-cta">
              <p className="font-extrabold">صاحب کسب‌وکار هستید؟</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                در همین دسته ثبت‌نام کنید تا مشتری‌ها شما را پیدا کنند.
              </p>
              <Link href="/dashboard/business-cards" className="indeed-btn indeed-btn-primary mt-3 w-full text-xs">
                ثبت کسب‌وکار
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
