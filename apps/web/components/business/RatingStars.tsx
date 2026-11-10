import { Star, StarHalf } from 'lucide-react';

interface Props {
  rating: number;
  /** icon size in Tailwind classes, e.g. `size-4` */
  className?: string;
  /** hide the numeric value next to the stars */
  hideValue?: boolean;
}

/**
 * Read-only star rating (supports halves) used in listings and the business
 * profile summary. The numeric value stays visible because the Persian
 * directory convention is to show both, e.g. «۴٫۸ (۳۹ نفر)».
 */
export function RatingStars({ rating, className = 'size-4', hideValue }: Props) {
  const safe = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  const full = Math.floor(safe);
  const fraction = safe - full;
  const half = fraction >= 0.25 && fraction < 0.75;
  const extra = fraction >= 0.75 ? 1 : 0;
  const filled = Math.min(5, full + extra);

  return (
    <span className="inline-flex items-center gap-1" aria-label={`امتیاز ${safe} از ۵`}>
      <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
        {Array.from({ length: filled }).map((_, index) => (
          <Star key={`full-${index}`} className={`${className} fill-amber-400`} />
        ))}
        {half ? <StarHalf className={`${className} fill-amber-400`} /> : null}
        {Array.from({ length: Math.max(0, 5 - filled - (half ? 1 : 0)) }).map(
          (_, index) => (
            <Star
              key={`empty-${index}`}
              className={`${className} text-[var(--vintage-border)]`}
            />
          ),
        )}
      </span>
      {hideValue ? null : (
        <span className="text-sm font-bold text-ink">{safe.toLocaleString('fa-IR')}</span>
      )}
    </span>
  );
}
