'use client';

import { BadgeCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * White/blue verification tick of a business.
 *
 *  - white: the owner completed the identity inquiry (شاهکار + هویتی)
 *  - blue:  the owner also verified the business license (جواز کسب)
 *
 * The hover/focus tooltip explains which one it is, so a visitor never has to
 * guess what the tick means.
 */
export function VerificationBadge({
  identity,
  businessLicense,
  className,
}: {
  identity?: boolean;
  businessLicense?: boolean;
  className?: string;
}) {
  if (!identity && !businessLicense) return null;
  const blue = Boolean(businessLicense);
  const label = blue
    ? 'هویت و جواز کسب تأیید شده — تیک آبی'
    : 'هویت تأیید شده — تیک سفید';
  return (
    <span
      className={cn(
        'group relative inline-flex items-center outline-none',
        className,
      )}
      tabIndex={0}
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
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 right-0 z-30 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block group-focus:block"
      >
        {label}
      </span>
    </span>
  );
}
