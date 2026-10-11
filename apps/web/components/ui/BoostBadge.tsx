'use client';

import { Crown, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Props {
  /** show the longer "پله" label next to the icon */
  withLabel?: boolean;
  className?: string;
}

/**
 * Eye-catching badge shown on cards/biolinks that an admin has boosted ("پله").
 * It uses a warm gold→orange gradient so other users notice it and are nudged
 * to boost their own cards.
 */
export function BoostBadge({ withLabel = true, className }: Props) {
  return (
    <span
      title="این کارت با فیچر پله به صدر لیست آورده شده است"
      className={cn(
        'relative inline-flex items-center gap-1 overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(120deg, #f59e0b 0%, #f97316 55%, #ef4444 100%)',
        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.45)',
      }}
    >
      <Crown className="size-3 drop-shadow" aria-hidden />
      {withLabel ? <span>پله</span> : null}
      <Sparkles className="size-3 opacity-90" aria-hidden />
    </span>
  );
}
