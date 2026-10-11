'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type AlertTone = 'error' | 'warning' | 'success' | 'info';

interface Props {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  /** optional upgrade CTA shown for quota/limit messages */
  action?: { href: string; label: string } | null;
  className?: string;
}

const TONE = {
  error: {
    wrap: 'border-red-200 bg-red-50 text-red-800',
    iconWrap: 'bg-red-100 text-red-600',
    Icon: XCircle,
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    iconWrap: 'bg-amber-100 text-amber-600',
    Icon: AlertTriangle,
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconWrap: 'bg-emerald-100 text-emerald-600',
    Icon: CheckCircle2,
  },
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-800',
    iconWrap: 'bg-sky-100 text-sky-600',
    Icon: Info,
  },
} as const;

/**
 * Styled feedback banner (Tailwind) used instead of the old one-line red text,
 * so users clearly notice quota / validation / warning messages.
 */
export function Alert({ tone = 'error', title, children, action, className }: Props) {
  const { wrap, iconWrap, Icon } = TONE[tone];
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'mt-4 flex items-start gap-3 rounded-xl border p-4 shadow-sm',
        wrap,
        className,
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          iconWrap,
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-extrabold">{title}</p> : null}
        <div className={cn(title ? 'mt-0.5' : '')}>{children}</div>
        {action ? (
          <Link
            href={action.href}
            className="mt-2 inline-flex items-center rounded-lg bg-white/70 px-3 py-1.5 text-xs font-bold underline-offset-2 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Heuristic: subscription-quota / limit messages should be shown as warnings. */
export function isQuotaMessage(message: string): boolean {
  return /سقف|اشتراک|ارتقا|محدودیت|تکمیل/.test(message);
}

/** Heuristic: plan-visibility messages explaining a hidden feature. */
export function isUpgradeHint(message: string): boolean {
  return /اشتراک|ارتقا|بسته/.test(message);
}
