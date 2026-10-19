'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';

import { useAuth } from '@/lib/auth';

interface Props {
  /** id of the record owner, from the public payload */
  ownerUserId?: string | null;
  /** dashboard edit route for this record, e.g. `/dashboard/biolinks/<id>/edit` */
  href: string;
  /** accessible label + tooltip, e.g. «ویرایش بیولینک» */
  label: string;
}

/**
 * A small «ویرایش» shortcut shown on a public biolink / business-card page
 * *only* to its own owner, linking straight to the dashboard edit form.
 *
 * Ownership can only be resolved in the browser (the public pages are
 * server-rendered), so the button stays hidden until the session store has
 * hydrated to avoid a server/client markup mismatch — same pattern as
 * `PlanUpgradeNotice`.
 */
export function OwnerEditButton({
  ownerUserId,
  href,
  label,
}: Props) {
  const { user, hydrated } = useAuth();

  if (!hydrated || !user || !ownerUserId) return null;
  if (user.id !== ownerUserId) return null;

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="record-pill"
    >
      <Pencil className="size-3.5" aria-hidden />
      ویرایش
    </Link>
  );
}
