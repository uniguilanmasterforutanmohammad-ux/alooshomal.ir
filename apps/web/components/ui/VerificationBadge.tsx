'use client';

import { BadgeCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * White/blue verification tick of a business.
 *
 *  - white: the owner completed the identity inquiry (شاهکار + هویتی)
 *  - blue:  the owner also verified the business license (جواز کسب)
 *
 * Only the white tick opens the hover/focus tooltip that explains it; the blue
 * tick is self-explanatory and stays tooltip-free.
 */
export function VerificationBadge({
  identity,
  businessLicense,
  className,
  placement = 'top',
}: {
  identity?: boolean;
  businessLicense?: boolean;
  className?: string;
  /** Where the hover tooltip opens; `bottom` avoids clipping inside cards. */
  placement?: 'top' | 'bottom';
}) {
  if (!identity && !businessLicense) return null;
  const blue = Boolean(businessLicense);
  const label = blue
    ? 'هویت و جواز کسب تأیید شده — تیک آبی'
    : 'هویت تأیید شده — تیک سفید';
  const showTooltip = !blue;
  return (
    <span
      className={cn(
        'group relative inline-flex items-center outline-none',
        className,
      )}
      tabIndex={showTooltip ? 0 : undefined}
      aria-label={label}
    >
      <BadgeCheck
        className={cn(
          'size-4',
          blue
            ? 'text-sky-500'
            : 'text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.75)]',
        )}
        aria-hidden
      />
      {showTooltip ? (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-30 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block group-focus:block',
            placement === 'bottom'
              ? 'left-0 top-full mt-1'
              : '-top-9 right-0',
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
