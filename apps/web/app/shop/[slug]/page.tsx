import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { ShopOrderForm } from '@/components/shop/ShopOrderForm';
import { JsonLd } from '@/components/seo/JsonLd';
import type { PublicShop } from '@/lib/api';
import {
  absoluteUrl,
  SERVER_API_URL,
  decodeSlugParam,
  metaDescription,
} from '@/lib/site';
import { breadcrumbJsonLd } from '@/lib/seo';

async function fetchShop(slug: string): Promise<PublicShop | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/public/shops/${encodeURIComponent(decodeSlugParam(slug))}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: PublicShop };
    return payload.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await fetchShop(slug);
  if (!shop) {
    return { title: 'فروشگاه پیدا نشد', robots: { index: false, follow: false } };
  }
  return {
    title: shop.workspace.name,
    description: metaDescription(
      null,
      `فروشگاه آنلاین ${shop.workspace.name} — مشاهده‌ی محصولات و ثبت سفارش.`,
    ),
    alternates: { canonical: `/shop/${shop.workspace.publicSlug}` },
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await fetchShop(slug);
  if (!shop) notFound();

  const url = absoluteUrl(`/shop/${shop.workspace.publicSlug}`);
  // Retail prices are stored in Toman (`IRT`); schema.org expects ISO 4217, so
  // convert to Rial (1 Toman = 10 Rial) rather than mislabelling the unit.
  const toRial = (toman: number) => toman * 10;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Store',
        '@id': url,
        name: shop.workspace.name,
        url,
        inLanguage: 'fa-IR',
        ...(shop.products.length > 0
          ? {
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: `محصولات ${shop.workspace.name}`,
                itemListElement: shop.products.map((product) => ({
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Product',
                    name: product.title,
                    ...(product.description ? { description: product.description } : {}),
                    ...(product.imageUrl ? { image: product.imageUrl } : {}),
                    ...(product.category ? { category: product.category } : {}),
                    ...(product.sku ? { sku: product.sku } : {}),
                  },
                  price: toRial(product.price),
                  priceCurrency: 'IRR',
                  availability:
                    product.stock > 0
                      ? 'https://schema.org/InStock'
                      : 'https://schema.org/OutOfStock',
                })),
              },
            }
          : {}),
      },
      breadcrumbJsonLd([
        { name: 'خانه', path: '/' },
        { name: 'فروشگاه‌ها', path: '/shop' },
        { name: shop.workspace.name },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="container-page grid gap-6 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">{shop.workspace.name}</h1>
            <p className="mt-1 text-sm text-muted">
              فروشگاه آنلاین • {shop.products.length.toLocaleString('fa-IR')} محصول
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              {shop.settings.city ? <li>شهر: {shop.settings.city}</li> : null}
              {shop.settings.snapEnabled ? (
                <li>
                  ارسال با پیک
                  {shop.settings.deliveryFee > 0
                    ? ` • کرایه ${shop.settings.deliveryFee.toLocaleString('fa-IR')} تومان`
                    : ' • کرایه رایگان'}
                </li>
              ) : null}
              {shop.settings.pickupEnabled ? (
                <li>
                  دریافت حضوری
                  {shop.settings.pickupHours ? ` • ${shop.settings.pickupHours}` : ''}
                </li>
              ) : null}
              {shop.settings.supportPhone ? (
                <li>
                  پشتیبانی:{' '}
                  <a
                    href={`tel:${shop.settings.supportPhone}`}
                    className="font-bold text-brand"
                  >
                    {shop.settings.supportPhone}
                  </a>
                </li>
              ) : null}
            </ul>
            {shop.settings.returnPolicy ? (
              <p className="mt-2 rounded-lg bg-[var(--vintage-paper)] p-2 text-[11px] leading-6 text-muted">
                شرایط لغو و مرجوعی: {shop.settings.returnPolicy}
              </p>
            ) : null}
          </div>
          {shop.products.length === 0 ? (
            <div className="indeed-panel p-8 text-center text-sm text-muted">
              این فروشگاه هنوز محصولی منتشر نکرده است.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shop.products.map((product) => (
                <article key={product.id} className="indeed-panel flex flex-col gap-2 p-4">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={product.title} className="h-40 w-full rounded-lg object-cover" />
                  ) : null}
                  <h2 className="text-sm font-extrabold text-ink">{product.title}</h2>
                  {product.category ? (
                    <p className="text-[11px] text-muted">{product.category}</p>
                  ) : null}
                  {product.description ? (
                    <p className="line-clamp-3 text-xs leading-6 text-muted">{product.description}</p>
                  ) : null}
                  <p className="mt-auto text-sm font-bold text-brand">
                    {product.price.toLocaleString('fa-IR')} تومان
                    {product.compareAtPrice && product.compareAtPrice > product.price ? (
                      <span className="ms-2 text-[11px] font-normal text-muted line-through">
                        {product.compareAtPrice.toLocaleString('fa-IR')}
                      </span>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
        <aside>
          <ShopOrderForm shop={shop} />
        </aside>
      </main>
    </>
  );
}
