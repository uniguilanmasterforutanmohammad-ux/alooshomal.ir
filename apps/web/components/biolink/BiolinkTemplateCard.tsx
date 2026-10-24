import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';

import { readableAccent } from '@/lib/card-spectrum';
import { cn } from '@/lib/utils';
import type { BiolinkTemplate } from '@/lib/biolink-templates';

export interface TemplateRow {
  key: string;
  label: string;
  value: string;
  href?: string;
  dir?: 'ltr' | 'rtl';
  /** icon rendered inside the contact chip (phone, mail, globe, …) */
  Icon?: LucideIcon;
}

export interface TemplateIcon {
  key: string;
  label: string;
  href: string;
  /** short glyph rendered inside the circle */
  glyph: string;
}

interface Props {
  template: BiolinkTemplate;
  fullName: string;
  /** the big heading (job/company/fullName, resolved by the caller) */
  headline: string;
  subline?: string | null;
  bio?: string | null;
  cityName?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
  rows?: TemplateRow[];
  icons?: TemplateIcon[];
  /** the owner's chosen colour, kept as a subtle accent */
  accent?: string | null;
  /** primary outward link (website), rendered as the leading button */
  website?: string | null;
  /** extra action buttons (save / vcard) rendered after the website link */
  footer?: React.ReactNode;
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

/**
 * Renders a public biolink in one of the 14 ready-made designs from the
 * reference file `biolinks.html`. Every template shares the same data shape
 * (cover/avatar, heading, tagline, contact rows, social glyphs, link buttons)
 * and the per-template look lives in the `.blt-<key>` CSS in `globals.css`.
 *
 * The component is presentational only: the public page decides which template
 * to show (owner's choice, admin default, or the visitor's live switch).
 */
export function BiolinkTemplateCard({
  template,
  fullName,
  headline,
  subline,
  bio,
  cityName,
  businessName,
  avatarUrl,
  rows = [],
  icons = [],
  accent,
  website,
  footer,
  headingLevel = 'h1',
  className,
}: Props) {
  const initials = (fullName || '?').trim().slice(0, 1);
  const Heading = headingLevel;
  const hasPhoto = template.key === 'bradley';
  const tagline = [subline, bio].filter(Boolean).join(' — ');

  return (
    <article
      className={cn('blt', `blt-${template.key}`, className)}
      style={{ ['--blt-accent' as string]: readableAccent(accent) }}
    >
      {hasPhoto ? (
        <div className="blt-photo">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={600}
              height={200}
              className="blt-photo-img"
              unoptimized
            />
          ) : null}
        </div>
      ) : (
        <div className="blt-top">
          <div className="blt-avatar">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                width={120}
                height={120}
                className="blt-avatar-img"
                unoptimized
              />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </div>
        </div>
      )}

      <div className="blt-body">
        <Heading className="blt-name">{headline}</Heading>
        {tagline ? <p className="blt-tagline">{tagline}</p> : null}

        {cityName || businessName ? (
          <div className="blt-chips">
            {cityName ? <span className="blt-chip">{cityName}</span> : null}
            {businessName ? <span className="blt-chip">{businessName}</span> : null}
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="blt-rows">
            {rows.map((row) => {
              const RowIcon = row.Icon;
              const rowContent = (
                <>
                  <span className="blt-row-ico" aria-hidden>
                    {RowIcon ? (
                      <RowIcon className="size-4" />
                    ) : (
                      <span className="blt-row-dot" />
                    )}
                  </span>
                  <span className="blt-row-text">
                    <span className="blt-row-label">{row.label}</span>
                    <span dir={row.dir ?? 'rtl'} className="blt-row-value">
                      {row.value}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={row.key}>
                  {row.href ? (
                    <a
                      href={row.href}
                      className="blt-row"
                      target={row.href.startsWith('http') ? '_blank' : undefined}
                      rel={row.href.startsWith('http') ? 'noreferrer' : undefined}
                    >
                      {rowContent}
                    </a>
                  ) : (
                    <span className="blt-row">{rowContent}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {icons.length > 0 ? (
          <nav className="blt-icons" aria-label="شبکه‌های اجتماعی">
            {icons.map((icon) => (
              <a
                key={icon.key}
                href={icon.href}
                target="_blank"
                rel="noreferrer"
                className="blt-icon"
                aria-label={icon.label}
                title={icon.label}
              >
                <span aria-hidden>{icon.glyph}</span>
              </a>
            ))}
          </nav>
        ) : null}

        {website || footer ? (
          <div className="blt-actions">
            {website ? (
              <a
                href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="blt-btn blt-btn-primary"
              >
                وب‌سایت
              </a>
            ) : null}
            {footer}
          </div>
        ) : null}
      </div>

      <div className="blt-brand">شمالی کارت</div>
    </article>
  );
}
