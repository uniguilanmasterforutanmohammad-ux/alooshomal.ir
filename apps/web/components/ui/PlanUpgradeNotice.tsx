'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpCircle } from 'lucide-react';

import { useAuth } from '@/lib/auth';

interface Props {
  /** id of the card owner, from the public payload */
  ownerUserId?: string | null;
  /** true when the owner's plan masks fields (links/socials) on the public page */
  hidesFields?: boolean;
}

/**
 * Shown above a public card only to its own owner when their plan is masking
 * fields (the free plan hides links, socials and the website). Without it the
 * owner just sees a card missing fields and assumes the data was lost, instead
 * of being nudged to upgrade for the full view.
 *
 * Ownership is resolved in the browser (the public pages are server-rendered),
 * so nothing is rendered until the session store has hydrated to avoid a
 * server/client markup mismatch.
 */
export function PlanUpgradeNotice({ ownerUserId, hidesFields }: Props) {
  const { user, hydrated } = useAuth();

  if (!hydrated || !user || !hidesFields || !ownerUserId) return null;
  if (user.id !== ownerUserId) return null;

  return (
    <div
      dir="rtl"
      className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-xs leading-6 font-bold">
          جهت نمایش کامل، لطفاً اشتراک خود را ارتقا دهید.
        </p>
      </div>
      <Link
        href="/dashboard/subscriptions"
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700"
      >
        <ArrowUpCircle className="size-3.5" aria-hidden />
        ارتقای اشتراک
      </Link>
    </div>
  );
}
