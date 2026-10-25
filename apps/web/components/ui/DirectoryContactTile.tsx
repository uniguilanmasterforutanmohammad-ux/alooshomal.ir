'use client';

import Link from 'next/link';
import { Building2, MapPin, Phone, Smartphone, UserRound } from 'lucide-react';

import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import { readableAccent } from '@/lib/card-spectrum';
import type { InteractionKind } from '@/lib/interactions';

interface Props {
  /** public page the whole tile links to */
  href: string;
  ariaLabel: string;
  kind: InteractionKind;
  slug: string;
  fullName: string;
  jobTitle?: string | null;
  company?: string | null;
  cityName?: string | null;
  businessName?: string | null;
  mobile?: string | null;
  landline?: string | null;
  /** the owner's chosen colour, used for the initial badge and icons */
  accent?: string | null;
  likeCount: number;
  liked: boolean;
  saved: boolean;
  /** boost/ad badge, absolutely positioned in the tile's top corner */
  badge?: React.ReactNode;
  /**
   * Phones-only field order for the tile's text block. `'name'` (default) keeps
   * the classic person-first layout at every width; `'role'` leads with «نام
   * کسب‌وکار» (`jobTitle`), then the person (`fullName`) and the company —
   * the order the business-card directory asks for on phones. Desktop is
   * untouched either way.
   */
  mobileOrder?: 'name' | 'role';
}

/** The first letter of the name — never a logo, matching the «دفترچه تلفن». */
function initial(name: string): string {
  return name.trim().charAt(0) || '؟';
}

/**
 * A fixed-size contact tile shared by the «کاشی» views of both public
 * directories. It shows the very same information the «دفترچه تلفن» notebook
 * rows do — name, role · company, city · business and *both* phone numbers — but
 * laid out as a compact tile. Every line truncates with an ellipsis so a long
 * value can never stretch the tile beyond its fixed height. The like/save
 * buttons are the shared, account-backed ones, so a like or save here is the
 * same record the list and notebook views use.
 */
export function DirectoryContactTile({
  href,
  ariaLabel,
  kind,
  slug,
  fullName,
  jobTitle,
  company,
  cityName,
  businessName,
  mobile,
  landline,
  accent,
  likeCount,
  liked,
  saved,
  badge,
  mobileOrder = 'name',
}: Props) {
  const meta = [jobTitle, company].filter(Boolean).join(' · ');
  const place = [cityName, businessName].filter(Boolean).join(' · ');
  const mobileNum = mobile?.trim() || '';
  const landlineNum = landline?.trim() || '';
  // On phones the business-card tiles reorder the head to «نام کسب‌وکار →
  // به مدیریت → شرکت»; the classic meta line (role · company) is hidden there
  // and the two fields are shown as their own lines instead.
  const roleFirst = mobileOrder === 'role';

  return (
    <div className="directory-tile">
      <div
        className="directory-tile-card"
        data-kind={kind}
        data-mobile-order={roleFirst ? 'role' : undefined}
        style={{ ['--tile-accent' as string]: readableAccent(accent) }}
      >
        {badge ? <div className="directory-tile-badges">{badge}</div> : null}

        <div className="directory-tile-head">
          <span className="directory-tile-initial" aria-hidden>
            {initial(fullName)}
          </span>
          <div className="directory-tile-headtext">
            <span className="directory-tile-name">{fullName}</span>
            {meta ? (
              <span className="directory-tile-line directory-tile-meta">
                <UserRound className="directory-tile-icon" aria-hidden />
                {meta}
              </span>
            ) : null}
            {roleFirst && jobTitle ? (
              <span className="directory-tile-line directory-tile-role">
                <UserRound className="directory-tile-icon" aria-hidden />
                {jobTitle}
              </span>
            ) : null}
            {roleFirst && company ? (
              <span className="directory-tile-line directory-tile-company">
                <Building2 className="directory-tile-icon" aria-hidden />
                {company}
              </span>
            ) : null}
          </div>
        </div>

        {place ? (
          <span className="directory-tile-line">
            <MapPin className="directory-tile-icon" aria-hidden />
            {place}
          </span>
        ) : null}

        <div className="directory-tile-phones">
          {mobileNum ? (
            <span className="directory-tile-phone">
              <Smartphone className="directory-tile-icon" aria-hidden />
              <span className="directory-tile-phone-label">همراه</span>
              <span dir="ltr" className="directory-tile-phone-num">
                {mobileNum}
              </span>
            </span>
          ) : null}
          {landlineNum ? (
            <span className="directory-tile-phone">
              <Phone className="directory-tile-icon" aria-hidden />
              <span className="directory-tile-phone-label">ثابت</span>
              <span dir="ltr" className="directory-tile-phone-num">
                {landlineNum}
              </span>
            </span>
          ) : null}
        </div>

      </div>

      <div className="directory-tile-actions">
        <LikeButton
          kind={kind}
          slug={slug}
          initialCount={likeCount}
          initialLiked={liked}
          reconcile={false}
        />
        <SaveButton kind={kind} slug={slug} initialSaved={saved} />
      </div>

      {/* Full-tile link (kept as a real anchor for crawlers) under the badges
          and action buttons, which sit above it with a higher z-index. */}
      <Link
        href={href}
        prefetch={false}
        aria-label={ariaLabel}
        className="absolute inset-0 z-[2] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
    </div>
  );
}
