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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const shopSlug = product.workspace.publicSlug;
              const href = shopSlug
                ? `/shop/${encodeURIComponent(shopSlug)}`
                : `/shop`;
              return (
                <Link
                  key={product.id}
                  href={href}
                  className="indeed-panel flex flex-col gap-2 overflow-hidden transition hover:border-brand/50"
                >
                  <div className="h-44 bg-[var(--vintage-paper)]">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted">
                        بدون تصویر
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <h2 className="text-sm font-extrabold text-ink">{product.title}</h2>
                    <p className="text-xs text-muted">{product.workspace.name}</p>
                    {product.category ? (
                      <span className="w-fit rounded-full bg-[var(--vintage-paper)] px-2 py-0.5 text-[10px] font-bold text-muted">
                        {product.category}
                      </span>
                    ) : null}
                    {product.description ? (
                      <p className="line-clamp-2 text-xs leading-6 text-muted">
                        {product.description}
                      </p>
                    ) : null}
                    <p className="mt-auto text-sm font-extrabold text-brand">
                      {product.price.toLocaleString('fa-IR')} تومان
                      {product.compareAtPrice && product.compareAtPrice > product.price ? (
                        <span className="ms-2 text-[11px] font-normal text-muted line-through">
                          {product.compareAtPrice.toLocaleString('fa-IR')}
                        </span>
                      ) : null}
                    </p>
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
