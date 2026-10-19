'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  IdCard,
  ExternalLink,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Twitter,
  UserRound,
  X,
} from 'lucide-react';

import { type BusinessCard } from '@/lib/api';
import { useDirectoryDetail } from '@/lib/directory-detail';
import { FitContent } from '@/components/ui/FitContent';
import { RecordView } from '@/components/ui/RecordView';
import { DetailTags } from '@/components/ui/DetailTags';

interface Props {
  slug: string;
  onClose: () => void;
  hideHeader?: boolean;
}

/**
 * Plain, readable detail panel used in the /business-cards directory. It follows the
 * site's own vintage style rather than the businessCard's theme, so browsing stays
 * calm and consistent; the themed look lives on the full businessCard page.
 */
export function DirectoryBusinessCardDetail({ slug, onClose, hideHeader }: Props) {
  // Served from the batch-warmed detail cache, so a clicked row paints on the
  // next frame; the single-slug request is only the fallback.
  const { item: businessCard, loading, error } = useDirectoryDetail<BusinessCard>(
    'business-cards',
    slug,
  );

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-16 w-16 animate-pulse rounded-full bg-soft" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-soft" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-soft" />
        <div className="h-24 animate-pulse rounded-lg bg-soft" />
      </div>
    );
  }

  if (error || !businessCard) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error ?? 'کارت ویزیت یافت نشد'}
        </p>
        <button onClick={onClose} className="indeed-btn indeed-btn-secondary mt-4">
          بازگشت به لیست
        </button>
      </div>
    );
  }

  const initials = businessCard.fullName.trim().slice(0, 1);

  const rows: Array<{ Icon: typeof Phone; label: string; value: string; href: string }> = [];
  if (businessCard.phone) rows.push({ Icon: Phone, label: 'تلفن', value: businessCard.phone, href: `tel:${businessCard.phone}` });
  if (businessCard.email) rows.push({ Icon: Mail, label: 'ایمیل', value: businessCard.email, href: `mailto:${businessCard.email}` });
  if (businessCard.website) rows.push({ Icon: Globe, label: 'وب‌سایت', value: businessCard.website, href: businessCard.website });
  if (businessCard.address) rows.push({ Icon: MapPin, label: 'آدرس', value: businessCard.address, href: '' });

  const socials: Array<{ value: string | null; Icon: typeof Linkedin; label: string }> = [
    { value: businessCard.linkedin, Icon: Linkedin, label: 'لینکدین' },
    { value: businessCard.instagram, Icon: Instagram, label: 'اینستاگرام' },
    { value: businessCard.telegram, Icon: Send, label: 'تلگرام' },
    { value: businessCard.twitter, Icon: Twitter, label: 'ایکس' },
    { value: businessCard.whatsapp, Icon: MessageCircle, label: 'واتساپ' },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--vintage-surface)]">
      <RecordView kind="business-cards" slug={slug} />
      {hideHeader ? null : (
            <div className="flex items-center justify-between border-b border-[var(--vintage-border)] px-5 py-3">
          <p className="text-sm font-bold text-ink">جزئیات کارت ویزیت</p>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-soft"
            aria-label="بستن جزئیات"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <FitContent className="dir-detail-scroll flex-1 overflow-y-auto px-5 py-5" minScale={0.7}>
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--vintage-border)] bg-soft text-xl font-extrabold text-brand">
            {businessCard.avatarUrl ? (
              <Image
                src={businessCard.avatarUrl}
                alt={businessCard.fullName}
                width={64}
                height={64}
                className="size-16 object-cover"
                unoptimized
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-ink">{businessCard.fullName}</h2>
            {businessCard.jobTitle ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <UserRound className="size-3.5 shrink-0" aria-hidden />
                {businessCard.jobTitle}
              </p>
            ) : null}
            {businessCard.company ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Building2 className="size-3.5 shrink-0" aria-hidden />
                {businessCard.company}
              </p>
            ) : null}
          </div>
        </div>

        {businessCard.bio ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink">{businessCard.bio}</p>
        ) : null}

        <DetailTags
          cityName={businessCard.city?.name}
          businessName={businessCard.business?.name}
        />

        {rows.length > 0 ? (
          <ul className="mt-4 flex flex-col divide-y divide-[var(--vintage-border)] border-y border-[var(--vintage-border)]">
            {rows.map((row) => {
              const content = (
                <span className="flex items-center gap-3 py-3 text-sm">
                  <row.Icon className="size-4 shrink-0 text-brand" aria-hidden />
                  <span className="w-20 shrink-0 text-xs text-muted">{row.label}</span>
                  <span dir={row.href ? 'ltr' : 'rtl'} className="min-w-0 flex-1 truncate text-ink">
                    {row.value}
                  </span>
                </span>
              );
              return (
                <li key={row.label}>
                  {row.href ? (
                    <a
                      href={row.href}
                      target={row.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="block hover:bg-soft"
                    >
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {socials.some((social) => social.value) ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-muted">شبکه‌های اجتماعی</p>
            <div className="flex flex-wrap items-center gap-2">
              {socials.map((social) =>
                social.value ? (
                  <a
                    key={social.label}
                    href={social.value}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="flex size-9 items-center justify-center rounded-full border border-[var(--vintage-border)] text-brand hover:border-brand hover:bg-soft"
                  >
                    <social.Icon className="size-4" aria-hidden />
                  </a>
                ) : null,
              )}
            </div>
          </div>
        ) : null}

        {businessCard.linkedBiolink ? (
          <Link
            href={`/biolinks/${businessCard.linkedBiolink.slug}`}
            className="indeed-btn indeed-btn-secondary mt-5 w-full"
          >
            <IdCard className="size-4" aria-hidden />
            مشاهده بیولینک این کارت ویزیت
          </Link>
        ) : null}

        <Link
          href={`/business-cards/${businessCard.slug}`}
          className={`indeed-btn indeed-btn-primary w-full ${
            businessCard.linkedBiolink ? 'mt-2' : 'mt-5'
          }`}
        >
          <ExternalLink className="size-4" aria-hidden />
          مشاهده صفحه کامل کارت ویزیت
        </Link>
      </FitContent>
    </div>
  );
}
