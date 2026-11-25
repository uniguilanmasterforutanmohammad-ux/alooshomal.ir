import type { Metadata } from 'next';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { fetchProductDirectory, fetchProductFacets } from '@/lib/catalog-server';
import { metaDescription } from '@/lib/site';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

export const metadata: Metadata = {
  title: 'دایرکتوری محصولات فروشگاه‌ها',
  description: metaDescription(
    null,
    'دایرکتوری محصولات فروشگاه‌های آنلاین شمالی‌کارت با جست‌وجو، فیلتر دسته‌بندی، فروشگاه و بازه‌ی قیمت.',
  ),
  alternates: { canonical: '/shop' },
};

type ShopSearchParams = {
  q?: string;
  shop?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};

export default async function ShopDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/shop')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="فروشگاه‌های آنلاین" />
      </>
    );
  }
  const params = await searchParams;
  const [products, facets] = await Promise.all([
    fetchProductDirectory(params),
    fetchProductFacets(),
  ]);
  const hasFilter = Boolean(
    params.q ||
      params.shop ||
      params.category ||
      params.minPrice ||
      params.maxPrice ||
      params.sort,
  );

  return (
    <>
      <Header />
      <main className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">دایرکتوری محصولات</h1>
          <p className="mt-1 text-sm text-muted">
            محصولات منتشرشده‌ی همه‌ی فروشگاه‌های آنلاین؛ برای ثبت سفارش وارد صفحه‌ی
            فروشگاه شوید.
          </p>
        </div>

        <form
          action="/shop"
          className="indeed-panel mb-6 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            جست‌وجو
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="نام یا توضیح محصول…"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            فروشگاه
            <select
              name="shop"
              defaultValue={params.shop ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">همه‌ی فروشگاه‌ها</option>
              {facets.shops.map((shop) => (
                <option key={shop.id} value={shop.slug ?? ''}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            دسته‌بندی
            <select
              name="category"
              defaultValue={params.category ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">همه‌ی دسته‌ها</option>
              {facets.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            از قیمت (تومان)
            <input
              type="number"
              name="minPrice"
              min={0}
              defaultValue={params.minPrice ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تا قیمت (تومان)
            <input
              type="number"
              name="maxPrice"
              min={0}
              defaultValue={params.maxPrice ?? ''}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            ترتیب
            <select
              name="sort"
              defaultValue={params.sort ?? 'newest'}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="newest">جدیدترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
            <button type="submit" className="indeed-btn indeed-btn-primary">
              اعمال فیلتر
            </button>
            {hasFilter ? (
              <Link href="/shop" className="indeed-btn">
                پاک‌کردن
              </Link>
            ) : null}
          </div>
        </form>

        <p className="mb-3 text-xs text-muted">
          {products.length.toLocaleString('fa-IR')} محصول پیدا شد
        </p>

        {products.length === 0 ? (
          <div className="indeed-panel p-10 text-center text-sm text-muted">
            محصولی با این فیلترها پیدا نشد.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => {
              const shopSlug = product.workspace.publicSlug;
              const href = shopSlug
                ? `/shop/${encodeURIComponent(shopSlug)}/p/${encodeURIComponent(
                    product.slug,
                  )}`
                : `/shop`;
              const discount =
                product.compareAtPrice &&
                product.compareAtPrice > product.price
                  ? Math.round(
                      ((product.compareAtPrice - product.price) /
                        product.compareAtPrice) *
                        100,
                    )
                  : 0;
              return (
                <Link
                  key={product.id}
                  href={href}
                  className="indeed-panel group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-square w-full bg-[var(--vintage-paper)]">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="size-full object-contain p-2 transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted">
                        بدون تصویر
                      </div>
                    )}
                    {discount > 0 ? (
                      <span className="absolute start-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {discount.toLocaleString('fa-IR')}٪
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <h2 className="line-clamp-2 text-xs font-bold leading-5 text-ink">
                      {product.title}
                    </h2>
                    <p className="text-[10px] text-muted">
                      {product.workspace.name}
                    </p>
                    {product.category ? (
                      <span className="w-fit rounded-full bg-[var(--vintage-paper)] px-2 py-0.5 text-[10px] font-bold text-muted">
                        {product.category}
                      </span>
                    ) : null}
                    <div className="mt-auto flex items-baseline gap-2 pt-1">
                      <span className="text-sm font-extrabold text-ink">
                        {product.price.toLocaleString('fa-IR')}
                        <span className="ms-1 text-[10px] font-normal text-muted">
                          تومان
                        </span>
                      </span>
                      {discount > 0 ? (
                        <span className="text-[10px] text-muted line-through">
                          {product.compareAtPrice?.toLocaleString('fa-IR')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
