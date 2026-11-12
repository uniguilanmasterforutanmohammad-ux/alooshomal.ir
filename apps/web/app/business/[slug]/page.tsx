import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';

import { BusinessGallery } from '@/components/business/BusinessGallery';
import { BusinessReviews } from '@/components/business/BusinessReviews';
import { BusinessSectionNav } from '@/components/business/BusinessSectionNav';
import { ClaimBusinessCardButton } from '@/components/business/ClaimBusinessCardButton';
import { RatingStars } from '@/components/business/RatingStars';
import { WorkingHoursTable } from '@/components/business/WorkingHoursTable';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { ShareButton } from '@/components/ui/ShareButton';
import {
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
} from '@/components/ui/SocialBrandIcons';
import {
  type BusinessCard,
  type BusinessReviewsPage,
  type BusinessReview,
} from '@/lib/api';
import {
  fetchBusinessReviews,
  fetchCategoryDirectory,
} from '@/lib/catalog-server';
import { fa, formatJalali } from '@/lib/jalali';
import { jsonLdHtml } from '@/lib/json-ld';
import {
  absoluteUrl,
  decodeSlugParam,
  metaDescription,
  SERVER_API_URL,
} from '@/lib/site';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import { socialHref } from '@/lib/social-fields';

interface BusinessCardPayload {
  businessCard: BusinessCard;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

function externalHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const EMPTY_REVIEWS: BusinessReviewsPage = {
  summary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
};

async function getBusinessCard(slug: string): Promise<BusinessCardPayload | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/business-cards/public/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: BusinessCardPayload };
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
  const data = await getBusinessCard(decodeSlugParam(slug));
  if (!data) {
    return { title: 'کسب‌وکار پیدا نشد', robots: { index: false, follow: false } };
  }
  const card = data.businessCard;
  const category = card.business?.name ?? card.jobTitle ?? 'کسب‌وکار';
  const city = card.city?.name;
  const title = `${card.fullName}${card.jobTitle ? ` — ${card.jobTitle}` : ''}${
    city ? ` در ${city}` : ''
  }`;
  const rating =
    card.ratingCount && card.ratingCount > 0
      ? ` امتیاز ${Number(card.ratingAvg ?? 0).toLocaleString('fa-IR')} از ۵ بر اساس ${fa(
          card.ratingCount,
        )} دیدگاه.`
      : '';
  const description = metaDescription(
    card.bio,
    `اطلاعات تماس، آدرس، ساعات کاری و دیدگاه‌های ${card.fullName} در دسته ${category}.${rating}`,
  );
  return {
    title,
    description,
    alternates: { canonical: `/business/${card.slug}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/business/${card.slug}`,
      images: card.logoUrl || card.avatarUrl ? [card.logoUrl || card.avatarUrl || ''] : undefined,
    },
  };
}

function buildJsonLd(card: BusinessCard, reviews: BusinessReviewsPage | null) {
  const url = absoluteUrl(`/business/${card.slug}`);
  const address = card.address
    ? {
        '@type': 'PostalAddress',
        streetAddress: card.address,
        ...(card.city?.name ? { addressLocality: card.city.name } : {}),
        addressCountry: 'IR',
      }
    : undefined;
  const sameAs = [
    card.website,
    card.instagram,
    card.telegram,
    card.linkedin,
    card.twitter,
  ].filter((value): value is string => Boolean(value));
  const summary = reviews?.summary;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: card.company || card.fullName,
    description: card.bio ?? undefined,
    image: card.gallery?.[0] || card.logoUrl || card.avatarUrl || undefined,
    url,
    ...(card.phone ? { telephone: card.phone } : {}),
    ...(address ? { address } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    employee: {
      '@type': 'Person',
      name: card.fullName,
      ...(card.jobTitle ? { jobTitle: card.jobTitle } : {}),
    },
    ...(summary && summary.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: summary.average,
            reviewCount: summary.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

function ReviewPreview({ review }: { review: BusinessReview }) {
  return (
    <li className="biz-review-item">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{review.authorName}</p>
        <RatingStars rating={review.rating} hideValue className="size-3.5" />
      </div>
      {review.comment ? (
        <p className="mt-1.5 line-clamp-3 text-sm leading-7 text-muted">{review.comment}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-muted">{formatJalali(review.createdAt)}</p>
    </li>
  );
}

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/business')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="کسب‌وکارها" />
      </>
    );
  }
  const decoded = decodeSlugParam(slug);
  const [payload, reviews] = await Promise.all([
    getBusinessCard(decoded),
    fetchBusinessReviews(decoded),
  ]);
  if (!payload) notFound();

  const card = payload.businessCard;
  const summary = reviews?.summary ?? EMPTY_REVIEWS.summary;
  const relatedData = card.business?.name
    ? await fetchCategoryDirectory(card.business.name, { sort: 'rating', page: '1' })
    : null;
  const related = (relatedData?.items ?? [])
    .filter((item) => item.slug !== card.slug)
    .slice(0, 4);
  const categoryHref = card.business?.name
    ? `/categories/${encodeURIComponent(card.business.name)}`
    : '/categories';
  const phone = card.mobile || card.phone;
  const whatsapp = card.whatsapp
    ? `https://wa.me/${card.whatsapp.replace(/[^0-9]/g, '')}`
    : null;
  const hasContact = Boolean(
    card.phone || card.mobile || card.email || card.website || card.address,
  );
  const socials = [
    card.whatsapp
      ? { href: whatsapp, label: 'واتساپ', Icon: MessageCircle }
      : null,
    card.instagram
      ? {
          href: socialHref('instagram', card.instagram),
          label: 'اینستاگرام',
          Icon: InstagramIcon,
        }
      : null,
    card.telegram
      ? { href: socialHref('telegram', card.telegram), label: 'تلگرام', Icon: Send }
      : null,
    card.linkedin
      ? { href: socialHref('linkedin', card.linkedin), label: 'لینکدین', Icon: LinkedinIcon }
      : null,
    card.twitter
      ? { href: socialHref('twitter', card.twitter), label: 'ایکس', Icon: TwitterIcon }
      : null,
  ].filter(
    (entry): entry is { href: string | null; label: string; Icon: LucideIcon } =>
      Boolean(entry),
  );

  return (
    <div className="min-h-screen bg-soft">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(buildJsonLd(card, reviews)) }}
      />
      <Header />
      <main className="container-page py-5 sm:py-8">
        <nav
          aria-label="مسیر صفحه"
          className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted"
        >
          <Link href="/" className="hover:text-brand">
            خانه
          </Link>
          <ChevronLeft className="size-3.5" aria-hidden />
          <Link href="/categories" className="hidden hover:text-brand sm:inline">
            دسته‌بندی مشاغل
          </Link>
          <ChevronLeft className="hidden size-3.5 sm:block" aria-hidden />
          <Link href={categoryHref} className="hidden hover:text-brand sm:inline">
            {card.business?.name ?? 'کسب‌وکارها'}
          </Link>
          <ChevronLeft className="hidden size-3.5 shrink-0 sm:block" aria-hidden />
          <span className="min-w-0 max-w-[45vw] truncate font-bold text-ink sm:max-w-xs">
            {card.fullName}
          </span>
        </nav>

        <section className="biz-hero">
          <div className="biz-hero-media">
            {card.logoUrl || card.avatarUrl ? (
              <Image
                src={card.logoUrl || card.avatarUrl || ''}
                alt={card.fullName}
                width={112}
                height={112}
                className="size-full object-cover"
                unoptimized
                priority
              />
            ) : (
              <span>{card.fullName.trim().slice(0, 1)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-ink sm:text-3xl">{card.fullName}</h1>
              {card.ownerVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  تأیید هویت
                </span>
              ) : null}
            </div>
            {card.jobTitle || card.company ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                {card.jobTitle ? (
                  <span className="inline-flex items-center gap-1">
                    <BriefcaseBusiness className="size-3.5" aria-hidden />
                    {card.jobTitle}
                  </span>
                ) : null}
                {card.company ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" aria-hidden />
                    {card.company}
                  </span>
                ) : null}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {card.business?.name ? (
                <Link
                  href={categoryHref}
                  className="rounded-full bg-brand-light px-2.5 py-1 font-bold text-brand"
                >
                  {card.business.name}
                </Link>
              ) : null}
              {card.city?.name ? (
                <span className="inline-flex items-center gap-1 text-muted">
                  <MapPin className="size-3.5" aria-hidden />
                  {card.city?.name}
                </span>
              ) : null}
              <a href="#reviews" className="inline-flex items-center gap-1 text-muted hover:text-brand">
                <RatingStars rating={summary.average} hideValue className="size-3.5" />
                {summary.count > 0
                  ? `${summary.average.toLocaleString('fa-IR')} (${fa(summary.count)} دیدگاه)`
                  : 'بدون دیدگاه'}
              </a>
            </div>

            <div className="biz-hero-actions">
              <div className="biz-hero-contact">
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="indeed-btn indeed-btn-primary"
                  >
                    <Phone className="size-4" aria-hidden />
                    تماس
                  </a>
                ) : null}
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="indeed-btn indeed-btn-secondary"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    واتساپ
                  </a>
                ) : null}
              </div>
              <div className="biz-hero-tools">
              <ShareButton
                url={absoluteUrl(`/business/${card.slug}`)}
                title={card.fullName}
                size="md"
                iconOnly
              />
                <SaveButton
                  kind="business-cards"
                  slug={card.slug}
                  size="md"
                  iconOnly
                  reconcile
                />
                <LikeButton
                  kind="business-cards"
                  slug={card.slug}
                  initialCount={payload.like?.likeCount ?? 0}
                  initialLiked={payload.like?.liked ?? false}
                  size="md"
                />
              </div>
            </div>
          </div>
        </section>

        <ClaimBusinessCardButton
          businessCardId={card.id}
          slug={card.slug}
          isUnclaimed={card.isUnclaimed}
        />

        <BusinessSectionNav />

        <div className="biz-layout">
          <div className="min-w-0 space-y-4">
            <section id="about" className="biz-section">
              <h2 className="biz-section-title">درباره این کسب‌وکار</h2>
              <p className="whitespace-pre-line text-sm leading-8 text-ink">
                {card.bio || 'توضیحی ثبت نشده است.'}
              </p>
            </section>

            <section id="gallery" className="biz-section">
              <h2 className="biz-section-title">تصاویر و ویدئوها</h2>
              <BusinessGallery images={card.gallery ?? []} name={card.fullName} />
            </section>

            <section id="info" className="biz-section">
              <h2 className="biz-section-title">اطلاعات کسب‌وکار</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="biz-subtitle">آدرس</h3>
                  <p className="flex items-start gap-2 text-sm leading-7 text-ink">
                    <MapPin className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
                    {card.address || 'آدرسی ثبت نشده است.'}
                  </p>
                  <div className="biz-map-placeholder">
                    <MapPin className="size-6 text-brand" aria-hidden />
                    <div>
                      <p className="text-sm font-bold text-ink">نقشه و مسیریابی</p>
                      <p className="mt-0.5 text-xs text-muted">
                        نمایش نقشه و مسیریابی به‌زودی در همین بخش فعال می‌شود.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="biz-subtitle">اطلاعات تماس</h3>
                  {hasContact ? (
                    <ul className="biz-contact-list">
                      {card.phone ? (
                        <li>
                          <Phone className="size-4 text-brand" aria-hidden />
                          <span className="w-16 shrink-0 text-xs text-muted">تلفن</span>
                          <a href={`tel:${card.phone}`} dir="ltr" className="truncate text-ink">
                            {card.phone}
                          </a>
                        </li>
                      ) : null}
                      {card.mobile ? (
                        <li>
                          <Smartphone className="size-4 text-brand" aria-hidden />
                          <span className="w-16 shrink-0 text-xs text-muted">همراه</span>
                          <a href={`tel:${card.mobile}`} dir="ltr" className="truncate text-ink">
                            {card.mobile}
                          </a>
                        </li>
                      ) : null}
                      {card.email ? (
                        <li>
                          <Mail className="size-4 text-brand" aria-hidden />
                          <span className="w-16 shrink-0 text-xs text-muted">ایمیل</span>
                          <a href={`mailto:${card.email}`} dir="ltr" className="truncate text-ink">
                            {card.email}
                          </a>
                        </li>
                      ) : null}
                      {card.website ? (
                        <li>
                          <Globe className="size-4 text-brand" aria-hidden />
                          <span className="w-16 shrink-0 text-xs text-muted">وب‌سایت</span>
                          <a
                            href={externalHref(card.website)}
                            target="_blank"
                            rel="noreferrer"
                            dir="ltr"
                            className="truncate text-brand hover:underline"
                          >
                            {card.website}
                          </a>
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">اطلاعات تماسی ثبت نشده است.</p>
                  )}
                  {socials.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {socials.map((social) => (
                        <a
                          key={social.label}
                          href={social.href ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={social.label}
                          className="flex size-9 items-center justify-center rounded-full border border-[var(--vintage-border)] text-brand hover:border-brand hover:bg-soft"
                        >
                          <social.Icon className="size-4" aria-hidden />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section id="hours" className="biz-section">
              <h2 className="biz-section-title">ساعات کاری</h2>
              <WorkingHoursTable hours={card.workingHours} />
            </section>

            <BusinessReviews
              slug={card.slug}
              initial={reviews ?? EMPTY_REVIEWS}
              ownerUserId={card.userId}
            />

            {related.length > 0 ? (
              <section className="biz-section">
                <div className="flex items-center justify-between">
                  <h2 className="biz-section-title mb-0">
                    کسب‌وکارهای مشابه
                  </h2>
                  <Link href={categoryHref} className="text-xs font-bold text-brand hover:underline">
                    مشاهده همه
                  </Link>
                </div>
                <ul className="biz-related">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link href={`/business/${item.slug}`} className="biz-related-item">
                        <span className="biz-related-media">
                          {item.logoUrl || item.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.logoUrl || item.avatarUrl || ''}
                              alt={item.fullName}
                              loading="lazy"
                            />
                          ) : (
                            item.fullName.trim().slice(0, 1)
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">
                            {item.fullName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {item.jobTitle || item.company || item.city?.name || ''}
                          </span>
                        </span>
                        <ArrowLeft className="size-4 shrink-0 text-brand" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="biz-aside">
            {hasContact ? (
              <div className="indeed-panel p-4">
                <h2 className="text-sm font-extrabold text-ink">تماس سریع</h2>
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="indeed-btn indeed-btn-primary mt-3 w-full"
                  >
                    <Phone className="size-4" aria-hidden />
                    {phone}
                  </a>
                ) : null}
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="indeed-btn indeed-btn-secondary mt-2 w-full"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    گفتگو در واتساپ
                  </a>
                ) : null}
                {card.website ? (
                  <a
                    href={externalHref(card.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="indeed-btn indeed-btn-secondary mt-2 w-full"
                  >
                    <Globe className="size-4" aria-hidden />
                    وب‌سایت کسب‌وکار
                  </a>
                ) : null}
                {card.address ? (
                  <p className="mt-3 flex items-start gap-1.5 border-t border-[var(--vintage-border)] pt-3 text-xs leading-6 text-muted">
                    <MapPin className="mt-1 size-3.5 shrink-0 text-brand" aria-hidden />
                    {card.address}
                  </p>
                ) : null}
              </div>
            ) : null}

            {payload.qr ? (
              <div className="indeed-panel p-4 text-center">
                <p className="text-sm font-extrabold text-ink">اشتراک‌گذاری سریع</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payload.qr}
                  alt="کد QR صفحه کسب‌وکار"
                  className="mx-auto mt-3 size-32 rounded-lg bg-white p-1"
                />
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  با اسکن این کد، صفحه کسب‌وکار را با دیگران به اشتراک بگذارید.
                </p>
              </div>
            ) : null}

            <div className="biz-aside-note">
              <Clock className="size-5 text-brand" aria-hidden />
              <p className="font-bold text-ink">پیش از مراجعه تماس بگیرید</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                ساعات کاری ممکن است در تعطیلات تغییر کند؛ برای اطمینان با کسب‌وکار
                تماس بگیرید.
              </p>
            </div>

            {reviews && reviews.items.length > 0 ? (
              <div className="indeed-panel p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-ink">آخرین دیدگاه‌ها</h2>
                  <a href="#reviews" className="text-[11px] font-bold text-brand hover:underline">
                    همه
                  </a>
                </div>
                <ul className="mt-2 divide-y divide-[var(--vintage-border)]">
                  {reviews.items.slice(0, 2).map((review) => (
                    <ReviewPreview key={review.id} review={review} />
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
