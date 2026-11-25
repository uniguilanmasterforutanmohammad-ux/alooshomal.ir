import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { ProductBuyBox } from '@/components/shop/ProductBuyBox';
import { JsonLd } from '@/components/seo/JsonLd';
import type { PublicProduct } from '@/lib/api';
import {
  absoluteUrl,
  SERVER_API_URL,
  decodeSlugParam,
  metaDescription,
} from '@/lib/site';
import { breadcrumbJsonLd } from '@/lib/seo';

async function fetchProduct(
  slug: string,
  product: string,
): Promise<PublicProduct | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/shops/${encodeURIComponent(
        decodeSlugParam(slug),
      )}/products/${encodeURIComponent(decodeSlugParam(product))}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: PublicProduct };
    return payload.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}): Promise<Metadata> {
  const { slug, product } = await params;
  const data = await fetchProduct(slug, product);
  if (!data) {
    return { title: 'محصول پیدا نشد', robots: { index: false, follow: false } };
  }
  const { product: item, workspace } = data;
  return {
    title: `${item.title} — ${workspace.name}`,
    description: metaDescription(
      item.description,
      `خرید ${item.title} از فروشگاه ${workspace.name}`,
    ),
    alternates: {
      canonical: `/shop/${workspace.publicSlug}/p/${item.slug}`,
    },
    openGraph: item.imageUrl ? { images: [item.imageUrl] } : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product } = await params;
  const data = await fetchProduct(slug, product);
  if (!data) notFound();

  const { product: item, workspace, related } = data;
  const url = absoluteUrl(`/shop/${workspace.publicSlug}/p/${item.slug}`);
  const images = [
    ...(item.imageUrl ? [item.imageUrl] : []),
    ...item.gallery.filter((image) => image !== item.imageUrl),
  ];
  const toRial = (toman: number) => toman * 10;
  const discount =
    item.compareAtPrice && item.compareAtPrice > item.price
      ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)
      : 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': url,
        name: item.title,
        ...(item.description ? { description: item.description } : {}),
        ...(images.length > 0 ? { image: images } : {}),
        ...(item.category ? { category: item.category } : {}),
        ...(item.sku ? { sku: item.sku } : {}),
        brand: { '@type': 'Brand', name: workspace.name },
        offers: {
          '@type': 'Offer',
          url,
          price: toRial(item.price),
          priceCurrency: 'IRR',
          availability:
            item.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: workspace.name },
        },
      },
      breadcrumbJsonLd([
        { name: 'خانه', path: '/' },
        { name: 'فروشگاه‌ها', path: '/shop' },
        { name: workspace.name, path: `/shop/${workspace.publicSlug}` },
        { name: item.title },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="container-page flex flex-col gap-8 py-8">
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-muted">
          <Link href="/" className="hover:text-brand">
            خانه
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-brand">
            فروشگاه‌ها
          </Link>
          <span>/</span>
          <Link
            href={`/shop/${workspace.publicSlug}`}
            className="hover:text-brand"
          >
            {workspace.name}
          </Link>
          {item.category ? (
            <>
              <span>/</span>
              <span className="text-ink">{item.category}</span>
            </>
          ) : null}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="indeed-panel flex flex-col gap-3 p-4">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-[var(--vintage-paper)]">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[0]}
                  alt={item.title}
                  className="size-full object-contain"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-sm text-muted">
                  بدون تصویر
                </span>
              )}
            </div>
            {images.length > 1 ? (
              <div className="grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="aspect-square overflow-hidden rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              {item.category ? (
                <span className="w-fit rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-bold text-brand">
                  {item.category}
                </span>
              ) : null}
              <h1 className="text-xl font-extrabold leading-8 text-ink">
                {item.title}
              </h1>
              {item.sku ? (
                <p className="text-[11px] text-muted" dir="ltr">
                  کد کالا: {item.sku}
                </p>
              ) : null}
              <div className="flex items-baseline gap-2">
                {discount > 0 ? (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {discount.toLocaleString('fa-IR')}٪ تخفیف
                  </span>
                ) : null}
                <span className="text-2xl font-extrabold text-ink">
                  {item.price.toLocaleString('fa-IR')}
                  <span className="ms-1 text-sm font-normal text-muted">
                    تومان
                  </span>
                </span>
                {discount > 0 ? (
                  <span className="text-sm text-muted line-through">
                    {item.compareAtPrice?.toLocaleString('fa-IR')}
                  </span>
                ) : null}
              </div>
            </div>

            <ProductBuyBox data={data} />

            <div className="indeed-panel flex flex-col gap-2 p-4 text-[11px] leading-6 text-muted">
              <p className="text-xs font-bold text-ink">
                فروشنده: {workspace.name}
              </p>
              {data.settings.supportPhone ? (
                <p>
                  پشتیبانی:{' '}
                  <a
                    href={`tel:${data.settings.supportPhone}`}
                    className="font-bold text-brand"
                  >
                    {data.settings.supportPhone}
                  </a>
                </p>
              ) : null}
              {data.settings.returnPolicy ? (
                <p>شرایط مرجوعی: {data.settings.returnPolicy}</p>
              ) : null}
            </div>
          </div>
        </div>

        {item.description ? (
          <section className="indeed-panel flex flex-col gap-2 p-5">
            <h2 className="text-sm font-extrabold text-ink">مشخصات و توضیحات</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-muted">
              {item.description}
            </p>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold text-ink">
              محصولات مشابه
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/shop/${workspace.publicSlug}/p/${entry.slug}`}
                  className="indeed-panel flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-square w-full bg-[var(--vintage-paper)]">
                    {entry.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.imageUrl}
                        alt={entry.title}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-2">
                    <p className="line-clamp-2 text-xs font-bold text-ink">
                      {entry.title}
                    </p>
                    <p className="mt-auto text-xs font-bold text-brand">
                      {entry.price.toLocaleString('fa-IR')} تومان
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
