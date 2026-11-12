import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Briefcase, MapPin } from 'lucide-react';

import { readableAccent } from '@/lib/card-spectrum';
import { cn } from '@/lib/utils';

export interface BizCardRow {
  key: string;
  label: string;
  value: string;
  /** when set the row becomes a link (tel:, mailto:, https: …) */
  href?: string;
  /** text direction of the value; phone/email/url are latin (ltr) */
  dir?: 'ltr' | 'rtl';
  Icon: LucideIcon;
}

export interface BizCardSocial {
  key: string;
  label: string;
  href: string;
  Icon: LucideIcon;
}

interface Props {
  fullName: string;
  jobTitle?: string | null;
  cityName?: string | null;
  businessName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  rows?: BizCardRow[];
  socials?: BizCardSocial[];
  /** the owner's chosen colour, used as the card's accent */
  accent?: string | null;
  /** dense variant (used when the card is scaled to fit one screen) */
  compact?: boolean;
  /** extra actions rendered at the bottom of the contact side */
  footer?: React.ReactNode;
  /**
   * heading element; the public page keeps an <h1> for SEO, while the live
   * preview uses a plain paragraph so the outline is not flooded.
   */
  headingLevel?: 'h1' | 'h2' | 'p';
  className?: string;
}

/**
 * Landscape «business card» face used on `/business-cards/<slug>` and its live
 * builder preview. It is deliberately a different presentation from the biolink
 * record: a two-panel card — a coloured identity panel (avatar, name, role,
 * location) beside a paper contact panel (labelled contact rows, bio and
 * icon-only social circles) — so the two kinds of page read differently while
 * staying on the site's vintage paper theme. The owner's colour drives
 * `--bizcard-accent` (through `readableAccent`) so «طیفی» cards keep their hue.
 */
export function BusinessCardFace({
  fullName,
  jobTitle,
  cityName,
  businessName,
  bio,
  avatarUrl,
  rows = [],
  socials = [],
  accent,
  compact,
  footer,
  headingLevel = 'p',
  className,
}: Props) {
  const initials = (fullName || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('');
  const Heading = headingLevel;
  // The card's location tag is always the city; «محله» stays an internal
  // detail and is not advertised on the business-card face.
  const locationLabel = cityName?.trim() || null;
  const hasTags = Boolean(locationLabel || businessName);

  return (
    <article
      className={cn('bizcard', compact && 'bizcard-compact', className)}
      style={{ ['--bizcard-accent' as string]: readableAccent(accent) }}
    >
      <header className="bizcard-side">
        <div className="bizcard-avatar">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={96}
              height={96}
              className="bizcard-avatar-img"
              unoptimized
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>

        <div className="bizcard-identity">
          <Heading className="bizcard-name">{fullName || 'کارت ویزیت'}</Heading>
          {jobTitle ? <p className="bizcard-role">{jobTitle}</p> : null}
        </div>

        {hasTags ? (
          <div className="bizcard-tags">
            {locationLabel ? (
              <span className="bizcard-tag">
                <MapPin aria-hidden />
                {locationLabel}
              </span>
            ) : null}
            {businessName ? (
              <span className="bizcard-tag">
                <Briefcase aria-hidden />
                {businessName}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="bizcard-main">
        {rows.length > 0 ? (
          <ul className="bizcard-rows">
            {rows.map((row) => {
              const content = (
                <>
                  <row.Icon className="bizcard-row-icon" aria-hidden />
                  <span className="bizcard-row-label">{row.label}</span>
                  <span dir={row.dir ?? 'rtl'} className="bizcard-row-value">
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
                      className="bizcard-row"
                    >
                      {content}
                    </a>
                  ) : (
                    <span className="bizcard-row">{content}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {bio ? <p className="bizcard-bio">{bio}</p> : null}

        {socials.length > 0 ? (
          <nav className="bizcard-socials" aria-label="شبکه‌های اجتماعی">
            {socials.map((social) => (
              <a
                key={social.key}
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                aria-label={social.label}
                title={social.label}
                className="bizcard-social"
              >
                <social.Icon aria-hidden />
              </a>
            ))}
          </nav>
        ) : null}

        {footer ? <div className="bizcard-footer">{footer}</div> : null}
      </div>
    </article>
  );
}
