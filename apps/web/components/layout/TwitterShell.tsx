'use client';

import type { ReactNode } from 'react';

import { TwitterRail } from '@/components/layout/TwitterRail';

interface Props {
  /** The centre column: sticky header + timeline/list. */
  children: ReactNode;
  /** The right-hand column (search, trends, call-to-action). */
  sidebar: ReactNode;
  /** Optional rail call-to-action (passed straight to `TwitterRail`). */
  action?: ReactNode;
  sidebarLabel?: string;
}

/**
 * The shared three-column Twitter/X layout used by `/feeds`, `/pulse` and
 * `/blog`: nav rail · centre timeline · right sidebar. Phones drop the two side
 * columns and keep the site's fixed bottom bar, so the centre column becomes
 * full-bleed. Colours come from the theme tokens via the `.tw-*` classes, so all
 * site themes and dark mode keep working.
 */
export function TwitterShell({
  children,
  sidebar,
  action,
  sidebarLabel = 'جستجو و پیشنهادها',
}: Props) {
  return (
    <div className="tw-page">
      <div className="tw-layout">
        <TwitterRail action={action} />
        <main className="tw-main">{children}</main>
        <aside className="tw-sidebar" aria-label={sidebarLabel}>
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
