import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Crown,
  Globe,
  Home,
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
import type { Biolink } from '@/lib/api';
import { socialHref as socialNetworkHref } from '@/lib/social-fields';

interface Props {
  biolink: Biolink;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

function socialHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Full public biolink page, rendered in the site's own vintage «record» style —
 * the same calm, readable layout as the /biolinks detail panel (cream paper,
 * dashed accent frame, labelled icon rows, circled social icons). The owner's
 * chosen colour is kept as the record accent so «طیفی» biolinks still look
 * like themselves, but the chrome (header, share block) stays on-brand paper.
 */
export function PublicBiolinkView({ biolink, qr, link, like }: Props) {
  const headline =
    biolink.company || biolink.jobTitle || biolink.fullName || 'بیولینک';
  const subline = biolink.company
    ? [biolink.fullName, biolink.jobTitle].filter(Boolean).join(' — ') || null
    : biolink.jobTitle
      ? biolink.fullName
      : null;

  const rows: RecordRow[] = [];
  if (biolink.mobile) {
    rows.push({
      key: 'mobile',
      label: 'تلفن همراه',
      value: biolink.mobile,
      href: `tel:${biolink.mobile}`,
      dir: 'ltr',
      Icon: Smartphone,
    });
  }
  if (biolink.phone) {
    rows.push({
      key: 'phone',
      label: 'تلفن ثابت',
      value: biolink.phone,
      href: `tel:${biolink.phone}`,
      dir: 'ltr',
      Icon: Phone,
    });
  }
  if (biolink.email) {
    rows.push({
      key: 'email',
      label: 'ایمیل',
      value: biolink.email,
      href: `mailto:${biolink.email}`,
      dir: 'ltr',
      Icon: Mail,
    });
  }
  if (biolink.website) {
    rows.push({
      key: 'website',
      label: 'وب‌سایت',
      value: biolink.website,
      href: socialHref(biolink.website),
      dir: 'ltr',
      Icon: Globe,
    });
  }
  if (biolink.address) {
    rows.push({
      key: 'address',
      label: 'آدرس',
      value: biolink.address,
      Icon: MapPin,
    });
  }

  const iconLinks: RecordIconLink[] = [
    biolink.whatsapp
      ? {
          key: 'whatsapp',
          label: 'واتساپ',
          href: `https://wa.me/${biolink.whatsapp.replace(/[^0-9]/g, '')}`,
          Icon: MessageCircle,
        }
      : null,
    biolink.instagram
      ? {
          key: 'instagram',
          label: 'اینستاگرام',
          href: socialNetworkHref('instagram', biolink.instagram),
          Icon: Instagram,
        }
      : null,
    biolink.telegram
      ? {
          key: 'telegram',
          label: 'تلگرام',
          href: socialNetworkHref('telegram', biolink.telegram),
          Icon: Send,
        }
      : null,
    biolink.linkedin
      ? {
          key: 'linkedin',
          label: 'لینکدین',
          href: socialNetworkHref('linkedin', biolink.linkedin),
          Icon: Linkedin,
        }
      : null,
    biolink.twitter
      ? {
          key: 'twitter',
          label: 'ایکس',
          href: socialNetworkHref('twitter', biolink.twitter),
          Icon: Twitter,
        }
      : null,
  ].filter((entry): entry is RecordIconLink => Boolean(entry));

  return (
    <div className="card-public-page record-page">
      <div className="record-page-inner">
        <div className="card-public-inner w-full max-w-[520px]">
          <PlanUpgradeNotice
            ownerUserId={biolink.userId}
            hidesFields={biolink.planHidesFields}
          />

          {/* One aligned row: back link · plan badge · home link. */}
          <div className="card-public-top mb-3 flex shrink-0 items-center justify-between gap-2">
            <Link href="/biolinks" className="record-pill">
              <ArrowRight className="size-3.5" aria-hidden />
              بازگشت به دایرکتوری
            </Link>

            <div className="flex items-center gap-2">
              {biolink.planName ? (
                <span className="record-pill">
                  <Crown className="size-3.5" aria-hidden />
                  نوع اشتراک: {biolink.planName}
                </span>
              ) : null}
              <OwnerEditButton
                ownerUserId={biolink.userId}
                href={`/dashboard/biolinks/${biolink.id}/edit`}
                label="ویرایش این بیولینک"
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
              fullName={biolink.fullName}
              headline={headline}
              subline={subline}
              bio={biolink.bio}
              cityName={biolink.city?.name}
              businessName={biolink.business?.name}
              avatarUrl={biolink.avatarUrl}
              rows={rows}
              iconLinks={iconLinks}
              accent={biolink.primaryColor}
              headingLevel="h1"
              footer={
                biolink.linkedBusinessCard ? (
                  <Link
                    href={`/business-cards/${biolink.linkedBusinessCard.slug}`}
                    className="indeed-btn indeed-btn-secondary w-full"
                  >
                    <Briefcase className="size-4" aria-hidden />
                    مشاهده کارت ویزیت این بیولینک
                  </Link>
                ) : null
              }
            />
          </CardFit>

          <div className="card-public-share record-panel mt-4 flex shrink-0 items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR کد بیولینک"
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
                  href={`/api/proxy/biolinks/public/${biolink.slug}/vcard`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-xs"
                >
                  ذخیره مخاطب
                </a>
                <LikeButton
                  kind="biolinks"
                  slug={biolink.slug}
                  initialCount={like?.likeCount ?? 0}
                  initialLiked={like?.liked ?? false}
                  size="md"
                />
                <ShareButton url={link} title={headline} size="md" iconOnly />
                <SaveButton
                  kind="biolinks"
                  slug={biolink.slug}
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
