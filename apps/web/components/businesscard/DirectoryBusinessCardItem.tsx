'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Building2, Phone, Smartphone, UserRound } from 'lucide-react';

import { BoostBadge } from '@/components/ui/BoostBadge';
import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { cn } from '@/lib/utils';
import type { DirectoryBusinessCard } from '@/lib/api';

interface Props {
  businessCard: DirectoryBusinessCard;
  selected: boolean;
  onSelect: () => void;
}

export function DirectoryBusinessCardItem({ businessCard, selected, onSelect }: Props) {
  const initials = businessCard.fullName.trim().slice(0, 1);
  const mobile = businessCard.mobile?.trim() || '';
  const landline = businessCard.phone?.trim() || '';
  const now = new Date();
  const directoryAd =
    businessCard.adDirectoryUntil &&
    new Date(businessCard.adDirectoryUntil) > now;
  const boosted =
    !directoryAd &&
    businessCard.boostedUntil &&
    new Date(businessCard.boostedUntil) > now;

  return (
    // The row is clickable (split view) but the *link* is a real `<a href>` on
    // the heading so crawlers can follow it to the detail page. Keeping the
    // like/save buttons outside the anchor avoids nesting interactive elements.
    <div
      role="button"
      tabIndex={-1}
      onClick={onSelect}
      className={cn(
        'indeed-panel relative w-full cursor-pointer border-s-4 p-4 text-right transition',
        selected
          ? 'border-s-brand bg-brand-light/40 shadow-sm'
          : 'border-s-transparent hover:border-s-brand/50 hover:shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-lg font-extrabold text-brand">
          {businessCard.avatarUrl ? (
            <Image
              src={businessCard.avatarUrl}
              alt={businessCard.fullName}
              width={48}
              height={48}
              className="size-12 object-cover"
              unoptimized
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* The badge sits inline above the name (not absolutely positioned) so
              it never collides with the phone numbers at the row's left edge. */}
          {directoryAd ? (
            <BoostBadge
              className="mb-1"
              label="تبلیغات"
              title="این کارت ویزیت تبلیغ هدفمند است و در همین دسته‌بندی شهر و کسب‌وکار در صدر لیست نمایش داده می‌شود"
            />
          ) : boosted ? (
            <BoostBadge
              className="mb-1"
              label="پله"
              title="این کارت ویزیت با «پله» به صدر لیست کل دایرکتوری آورده شده است و با ثبت موارد جدیدتر پایین می‌رود"
            />
          ) : null}
          <h3
            className={cn(
              'truncate text-base font-extrabold',
              selected ? 'text-brand' : 'text-ink',
            )}
          >
            <Link
              href={`/business-cards/${businessCard.slug}`}
              onClick={(event) => {
                event.preventDefault();
                onSelect();
              }}
              className="hover:underline focus:underline focus:outline-none"
            >
              {businessCard.fullName}
              {/* descriptive anchor text for crawlers (avoids "click here") */}
              <span className="sr-only">
                {' '}
                — مشاهده کارت ویزیت {businessCard.fullName}
                {businessCard.jobTitle ? ` (${businessCard.jobTitle})` : ''}
              </span>
            </Link>
          </h3>
          {businessCard.jobTitle ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{businessCard.jobTitle}</span>
            </p>
          ) : null}
          {businessCard.company ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{businessCard.company}</span>
            </p>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <LikeButton
              kind="business-cards"
              slug={businessCard.slug}
              initialCount={businessCard.likeCount ?? 0}
              initialLiked={businessCard.liked ?? false}
              reconcile={false}
            />
            <SaveButton
              kind="business-cards"
              slug={businessCard.slug}
              initialSaved={businessCard.saved ?? false}
            />
          </div>
        </div>

        {/* Numbers sit at the row's far (left) edge so a glance down the list
            reads the phone column like a real phonebook. */}
        {mobile || landline ? (
          <div className="flex shrink-0 flex-col items-start gap-1 text-xs text-muted">
            {mobile ? (
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-3.5 shrink-0 text-brand" aria-hidden />
                <span className="sr-only">تلفن همراه</span>
                <span dir="ltr">{mobile}</span>
              </span>
            ) : null}
            {landline ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0 text-brand" aria-hidden />
                <span className="sr-only">تلفن ثابت</span>
                <span dir="ltr">{landline}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
