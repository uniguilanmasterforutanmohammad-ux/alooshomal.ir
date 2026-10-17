'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PenLine, UserPlus } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Props {
  /** visually distinct style for the homepage header vs. stacked panels */
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * «درخواست شهروند خبرنگار» call-to-action shown on the home page and the
 * «نبض شهر» pages. For users who are already citizen-reporters (or admins) the
 * button turns into «ثبت خبر» and links to the reporter panel, so approved
 * reporters get a direct shortcut to file a news item. Anonymous visitors are
 * sent to login and returned to their panel afterwards.
 */
export function ReporterCtaButton({ variant = 'secondary', className }: Props) {
  const { token, user, hydrated } = useAuth();
  // The stored role can be stale right after an admin approves the request, so
  // confirm it against the server before deciding whether to hide the button.
  const [serverRole, setServerRole] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setServerRole(null);
      return;
    }
    let active = true;
    api
      .get<{ role: string }>('/auth/me')
      .then((me) => active && setServerRole(me.role))
      .catch(() => {
        /* keep the stored role as a fallback */
      });
    return () => {
      active = false;
    };
  }, [token]);

  // Wait for localStorage hydration before deciding, so the button does not
  // flash for a reporter on first paint.
  if (!hydrated) return null;

  const effectiveRole = token ? serverRole ?? user?.role : user?.role;
  const alreadyReporter =
    effectiveRole === 'CITIZEN_REPORTER' || effectiveRole === 'ADMIN';

  if (alreadyReporter) {
    return (
      <Link
        href="/dashboard/reporter"
        className={cn(
          variant === 'primary' ? 'indeed-btn indeed-btn-primary' : 'indeed-btn indeed-btn-secondary',
          'py-2 text-sm',
          className,
        )}
      >
        <PenLine className="size-4" aria-hidden />
        ثبت خبر
      </Link>
    );
  }

  const href = token ? '/dashboard/reporter' : '/login?next=/dashboard/reporter';

  return (
    <Link
      href={href}
      className={cn(
        variant === 'primary' ? 'indeed-btn indeed-btn-primary' : 'indeed-btn indeed-btn-secondary',
        'py-2 text-sm',
        className,
      )}
    >
      <UserPlus className="size-4" aria-hidden />
      درخواست شهروند خبرنگار
    </Link>
  );
}
