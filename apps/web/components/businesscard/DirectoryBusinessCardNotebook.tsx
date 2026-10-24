'use client';

import Link from 'next/link';
import { MapPin, Phone, Smartphone } from 'lucide-react';

import { LikeButton } from '@/components/ui/LikeButton';
import { SaveButton } from '@/components/ui/SaveButton';
import type { DirectoryBusinessCard } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Fallback spine colour, used when a card has no valid `primaryColor`. */
const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

function avatarColor(card: DirectoryBusinessCard, index: number): string {
  const color = card.primaryColor?.trim();
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
    ? color
    : COLORS[index % COLORS.length];
}

/** Wraps the first query match so the row can highlight what was searched. */
function highlight(text: string, query: string): React.ReactNode {
  const index = query ? text.indexOf(query) : -1;
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

/** The first letter of the name — the book's alphabetical tab. */
function initial(name: string): string {
  return name.trim().charAt(0) || '؟';
}

interface Props {
  items: DirectoryBusinessCard[];
  loading: boolean;
  query: string;
  /** Infinite-scroll sentinel, owned by the parent's `useInfiniteScroll`. */
  sentinelRef: React.Ref<HTMLDivElement>;
  hasNext: boolean;
  /** Groups rows under sticky alphabetical tabs — true for the «الفبا» sort. */
  grouped: boolean;
}

/**
 * «دفترچه تلفن» — the notebook look of the business-card directory.
 *
 * Renders the very same published cards as the list and tile views, but as a
 * ruled paper notebook: every contact shows only the *initial* of its name
 * (never a logo), both phone numbers, and — like the list view — the *shared*
 * account-backed like/save buttons, so a like or save here is the same record
 * the /business-cards list and «ذخیره‌شده‌های من» use.
 */
export function DirectoryBusinessCardNotebook({
  items,
  loading,
  query,
  sentinelRef,
  hasNext,
  grouped,
}: Props) {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.replace(/\s/g, '');

  let lastLetter = '';

  return (
    <div className="notebook-scroll" aria-label="دفترچه تلفن">
      <div className="notebook-paper">
        {items.map((card, index) => {
          const letter = initial(card.fullName);
          const showTab = grouped && letter !== lastLetter;
          lastLetter = letter;
          const mobile = card.mobile?.trim() || '';
          const landline = card.phone?.trim() || '';
          const primary = mobile || landline;
          const meta = [card.jobTitle, card.company].filter(Boolean).join(' · ');
          const place = [card.city?.name, card.business?.name].filter(Boolean).join(' · ');

          return (
            <div key={card.id} className="notebook-entry">
              {showTab ? (
                <div className="notebook-tab" id={`letter-${letter}`} aria-hidden>
                  {letter}
                </div>
              ) : null}

              <div className="notebook-row">
                <span
                  className="notebook-initial"
                  style={{ background: avatarColor(card, index) }}
                  aria-hidden
                >
                  {letter}
                </span>

                <div className="notebook-info">
                  <Link
                    href={`/business-cards/${card.slug}`}
                    prefetch={false}
                    className="notebook-name"
                  >
                    {highlight(card.fullName, trimmedQuery)}
                  </Link>
                  {meta ? (
                    <span className="notebook-meta">{highlight(meta, trimmedQuery)}</span>
                  ) : null}
                  {place ? (
                    <span className="notebook-place">
                      <MapPin className="size-3" aria-hidden />
                      {place}
                    </span>
                  ) : null}
                  <div className="notebook-phones">
                    {mobile ? (
                      <span className="notebook-phone">
                        <Smartphone className="size-3.5" aria-hidden />
                        <span className="notebook-phone-label">همراه</span>
                        <span className="notebook-phone-num">
                          {highlight(mobile, normalizedQuery)}
                        </span>
                      </span>
                    ) : null}
                    {landline ? (
                      <span className="notebook-phone">
                        <Phone className="size-3.5" aria-hidden />
                        <span className="notebook-phone-label">ثابت</span>
                        <span className="notebook-phone-num">
                          {highlight(landline, normalizedQuery)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="notebook-actions">
                  <LikeButton
                    kind="business-cards"
                    slug={card.slug}
                    initialCount={card.likeCount ?? 0}
                    initialLiked={card.liked ?? false}
                    reconcile={false}
                  />
                  <SaveButton
                    kind="business-cards"
                    slug={card.slug}
                    initialSaved={card.saved ?? false}
                  />
                  {primary ? (
                    <a
                      className="notebook-call"
                      href={`tel:${primary}`}
                      aria-label={`تماس با ${card.fullName}`}
                    >
                      تماس
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={sentinelRef} className={cn('h-2')} aria-hidden />
        {loading ? <div className="notebook-more">در حال بارگذاری موارد بیشتر...</div> : null}
        {!loading && !hasNext && items.length > 0 ? (
          <div className="notebook-more">همه نتایج نمایش داده شد.</div>
        ) : null}
      </div>
    </div>
  );
}
