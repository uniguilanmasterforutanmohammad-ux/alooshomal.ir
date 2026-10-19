import Link from 'next/link';
import {
  ArrowRight,
  Crown,
  Globe,
  Home,
  IdCard,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  Twitter,
} from 'lucide-react';

import { CardFit } from '@/components/ui/CardFit';
import { LikeButton } from '@/components/ui/LikeButton';
import { OwnerEditButton } from '@/components/ui/OwnerEditButton';
import { PlanUpgradeNotice } from '@/components/ui/PlanUpgradeNotice';
import { SaveButton } from '@/components/ui/SaveButton';
import { ShareButton } from '@/components/ui/ShareButton';
import {
  RecordCard,
  type RecordIconLink,
  type RecordRow,
} from '@/components/ui/RecordCard';
import type { BusinessCard } from '@/lib/api';

interface Props {
  businessCard: BusinessCard;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

function socialHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Full public business-card page, rendered in the site's own vintage «record»
 * style — the same calm, readable layout as the /business-cards detail panel
 * (cream paper, dashed accent frame, labelled icon rows, circled social icons).
 * The owner's chosen colour is kept as the record accent so «طیفی» cards still
 * look like themselves, while the chrome stays on-brand paper.
 */
export function PublicBusinessCardView({ businessCard, qr, link, like }: Props) {
  const headline = businessCard.jobTitle || businessCard.fullName || 'کارت ویزیت';
  const subline = `به مدیریت ${businessCard.fullName || '—'}`;

  const rows: RecordRow[] = [];
  if (businessCard.mobile) {
    rows.push({
      key: 'mobile',
      label: 'تلفن همراه',
      value: businessCard.mobile,
      href: `tel:${businessCard.mobile}`,
      dir: 'ltr',
      Icon: Smartphone,
    });
  }
  if (businessCard.phone) {
    rows.push({
      key: 'phone',
      label: 'تلفن ثابت',
      value: businessCard.phone,
      href: `tel:${businessCard.phone}`,
      dir: 'ltr',
      Icon: Phone,
    });
  }
  if (businessCard.email) {
    rows.push({
      key: 'email',
      label: 'ایمیل',
      value: businessCard.email,
      href: `mailto:${businessCard.email}`,
      dir: 'ltr',
      Icon: Mail,
    });
  }
  if (businessCard.website) {
    rows.push({
      key: 'website',
      label: 'وب‌سایت',
      value: businessCard.website,
      href: socialHref(businessCard.website),
      dir: 'ltr',
      Icon: Globe,
    });
  }
  if (businessCard.address) {
    rows.push({
      key: 'address',
      label: 'آدرس',
      value: businessCard.address,
      Icon: MapPin,
    });
  }

  const iconLinks: RecordIconLink[] = [
    businessCard.whatsapp
      ? {
          key: 'whatsapp',
          label: 'واتساپ',
          href: `https://wa.me/${businessCard.whatsapp.replace(/[^0-9]/g, '')}`,
          Icon: MessageCircle,
        }
      : null,
    businessCard.instagram
      ? {
          key: 'instagram',
          label: 'اینستاگرام',
          href: socialHref(businessCard.instagram),
          Icon: Instagram,
        }
      : null,
    businessCard.telegram
      ? { key: 'telegram', label: 'تلگرام', href: socialHref(businessCard.telegram), Icon: Send }
      : null,
    businessCard.linkedin
      ? {
          key: 'linkedin',
          label: 'لینکدین',
          href: socialHref(businessCard.linkedin),
          Icon: Linkedin,
        }
      : null,
    businessCard.twitter
      ? { key: 'twitter', label: 'ایکس', href: socialHref(businessCard.twitter), Icon: Twitter }
      : null,
  ].filter((entry): entry is RecordIconLink => Boolean(entry));

  return (
    <div className="card-public-page record-page">
      <div className="record-page-inner">
        <div className="card-public-inner w-full max-w-[520px]">
          <PlanUpgradeNotice
            ownerUserId={businessCard.userId}
            hidesFields={businessCard.planHidesFields}
          />

          {/* One aligned row: back link · plan badge · home link. */}
          <div className="card-public-top mb-3 flex shrink-0 items-center justify-between gap-2">
            <Link href="/business-cards" className="record-pill">
              <ArrowRight className="size-3.5" aria-hidden />
              بازگشت به دایرکتوری
            </Link>

            <div className="flex items-center gap-2">
              {businessCard.planName ? (
                <span className="record-pill">
                  <Crown className="size-3.5" aria-hidden />
                  نوع اشتراک: {businessCard.planName}
                </span>
              ) : null}
              <OwnerEditButton
                ownerUserId={businessCard.userId}
                href={`/dashboard/business-cards/${businessCard.id}/edit`}
                label="ویرایش این کارت ویزیت"
              />
            </div>

            <Link href="/" className="record-pill">
              <Home className="size-3.5" aria-hidden />
              صفحه اصلی
            </Link>
          </div>

          {/* The chrome above and below stays put; this region shrinks the
              record to fit one screen (falling back to scrolling only when even
              the minimum scale cannot fit). */}
          <CardFit>
            <RecordCard
              fullName={businessCard.fullName}
              headline={headline}
              subline={subline}
              bio={businessCard.bio}
              cityName={businessCard.city?.name}
              businessName={businessCard.business?.name}
              avatarUrl={businessCard.avatarUrl}
              rows={rows}
              iconLinks={iconLinks}
              accent={businessCard.primaryColor}
              headingLevel="h1"
              footer={
                businessCard.linkedBiolink ? (
                  <Link
                    href={`/biolinks/${businessCard.linkedBiolink.slug}`}
                    className="indeed-btn indeed-btn-secondary w-full"
                  >
                    <IdCard className="size-4" aria-hidden />
                    مشاهده بیولینک این کارت
                  </Link>
                ) : null
              }
            />
          </CardFit>

          <div className="card-public-share record-panel mt-4 flex shrink-0 items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR کد کارت ویزیت"
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-lg bg-white p-1.5"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs font-bold text-ink">
                اسکن کنید یا لینک را به اشتراک بگذارید
              </p>
              <p dir="ltr" className="mt-1 break-all text-[11px] text-muted">
                {link}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/api/proxy/business-cards/public/${businessCard.slug}/vcard`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-xs"
                >
                  ذخیره مخاطب
                </a>
                <LikeButton
                  kind="business-cards"
                  slug={businessCard.slug}
                  initialCount={like?.likeCount ?? 0}
                  initialLiked={like?.liked ?? false}
                  size="md"
                />
                <ShareButton url={link} title={headline} size="md" iconOnly />
                <SaveButton
                  kind="business-cards"
                  slug={businessCard.slug}
                  size="md"
                  iconOnly
                  reconcile
                />
              </div>
            </div>
          </div>

          <p className="mt-3 shrink-0 text-center text-xs text-muted">
            ساخته‌شده با{' '}
            <Link href="/" className="font-bold underline">
              شمالی کارت
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
