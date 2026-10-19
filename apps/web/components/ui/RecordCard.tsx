import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Briefcase, Building2, MapPin } from 'lucide-react';

import { readableAccent } from '@/lib/card-spectrum';
import { cn } from '@/lib/utils';

export interface RecordRow {
  key: string;
  label: string;
  value: string;
  /** when set the row becomes a link (tel:, mailto:, https: …) */
  href?: string;
  /** text direction of the value; phone/email/url are latin (ltr) */
  dir?: 'ltr' | 'rtl';
  Icon: LucideIcon;
}

export interface RecordIconLink {
  key: string;
  label: string;
  href: string;
  Icon: LucideIcon;
}

interface Props {
  fullName: string;
  /** the big heading: the business/company (biolink) or the role (business card) */
  headline: string;
  /** a smaller line under the heading: the person, or «به مدیریت …» */
  subline?: string | null;
  bio?: string | null;
  companyName?: string | null;
  cityName?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
  rows?: RecordRow[];
  iconLinks?: RecordIconLink[];
  /** the owner's chosen colour, used as the record's accent */
  accent?: string | null;
  /** dense variant used inside the home-page sliders */
  compact?: boolean;
  /** extra actions rendered at the bottom of the card */
  footer?: React.ReactNode;
  /**
   * heading element; public pages keep an <h1> for SEO, while sliders/list
   * contexts use a plain paragraph so the page outline is not flooded.
   */
  headingLevel?: 'h1' | 'h2' | 'p';
  className?: string;
}

/**
 * The site's own vintage «record» presentation, shared by the public biolink /
 * business-card pages and the home-page sliders. It mirrors the directory
 * detail panel: a cream surface inside a dashed accent frame, a rounded-square
 * avatar, a big heading, city/business chips, labelled icon rows and circled
 * contact icons. The owner's colour is kept as the accent (`--record-accent`)
 * so the «طیفی» colour choice still changes the page.
 */
export function RecordCard({
  fullName,
  headline,
  subline,
  bio,
  companyName,
  cityName,
  businessName,
  avatarUrl,
  rows = [],
  iconLinks = [],
  accent,
  compact,
  footer,
  headingLevel = 'p',
  className,
}: Props) {
  const initials = (fullName || '?').trim().slice(0, 1);
  const hasChips = Boolean(companyName || cityName || businessName);
  const Heading = headingLevel;

  return (
    <article
      className={cn('record-card', compact && 'record-card-compact', className)}
      style={{ ['--record-accent' as string]: readableAccent(accent) }}
    >
      <header className="record-head">
        <div className="record-avatar">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={88}
              height={88}
              className="record-avatar-img"
              unoptimized
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>
        <div className="record-headtext">
          <Heading className="record-name">{headline}</Heading>
          {subline ? <p className="record-subline">{subline}</p> : null}
        </div>
      </header>

      {hasChips ? (
        <div className="record-chips">
          {companyName ? (
            <span className="record-chip">
              <Building2 aria-hidden />
              {companyName}
            </span>
          ) : null}
          {cityName ? (
            <span className="record-chip">
              <MapPin aria-hidden />
              {cityName}
            </span>
          ) : null}
          {businessName ? (
            <span className="record-chip">
              <Briefcase aria-hidden />
              {businessName}
            </span>
          ) : null}
        </div>
      ) : null}

      {bio ? <p className="record-bio">{bio}</p> : null}

      {rows.length > 0 ? (
        <ul className="record-rows">
          {rows.map((row) => {
            const content = (
              <>
                <row.Icon className="record-row-icon" aria-hidden />
                <span className="record-row-label">{row.label}</span>
                <span dir={row.dir ?? 'rtl'} className="record-row-value">
                  {row.value}
                </span>
              </>
            );
            return (
              <li key={row.key}>
                {row.href ? (
                  <a
                    href={row.href}
                    target={row.href.startsWith('http') ? '_blank' : undefined}
                    rel={row.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="record-row"
                  >
                    {content}
                  </a>
                ) : (
                  <span className="record-row">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {iconLinks.length > 0 ? (
        <div className="record-socials">
          {iconLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
              aria-label={link.label}
              className="record-social"
            >
              <link.Icon aria-hidden />
            </a>
          ))}
        </div>
      ) : null}

      {footer ? <div className="record-card-footer">{footer}</div> : null}
    </article>
  );
}
