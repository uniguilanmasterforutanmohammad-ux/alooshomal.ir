'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Headset } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORT_POLL_MS } from '@/lib/support-chat';
import { cn } from '@/lib/utils';
import { SupportChatPanel } from './SupportChatPanel';

const HIDDEN_PREFIXES = ['/admin', '/moderator', '/dashboard/support'];
const HIDDEN_EXACT = ['/login', '/register', '/admin/login'];

/**
 * Site-wide floating support button. It is mounted once in the root layout, so
 * every public page and the user dashboard get the same live chat entry point.
 * Admin/moderation screens hide it (they own the support inbox) to keep those
 * workspaces uncluttered.
 */
export function SupportChatWidget() {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const hidden =
    HIDDEN_EXACT.includes(pathname) ||
    HIDDEN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }
    let active = true;
    async function tick() {
      try {
        const result = await api.get<{ unread: number }>(
          '/support/chat/me/unread-count',
        );
        if (active) setUnread(result.unread);
      } catch {
        /* transient — keep the last badge */
      }
    }
    void tick();
    const timer = setInterval(tick, SUPPORT_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [hydrated, token, open]);

  if (hidden) return null;
  const badge = hydrated && token ? unread : 0;

  return (
    <>
      {open ? (
        <div
          className="fixed bottom-20 left-3 z-[60] flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border-2 border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] shadow-2xl lg:bottom-6 lg:left-6"
          role="dialog"
          aria-label="گفتگوی پشتیبانی آنلاین"
        >
          <SupportChatPanel variant="widget" onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setUnread(0);
        }}
        aria-expanded={open}
        aria-label={open ? 'بستن پشتیبانی آنلاین' : 'پشتیبانی آنلاین'}
        className={cn(
          'fixed bottom-20 left-3 z-[60] flex items-center gap-2 rounded-full border-2 border-[var(--vintage-accent-hover)] bg-brand px-4 py-3 text-sm font-extrabold text-white shadow-xl transition hover:brightness-110 lg:bottom-6 lg:left-6',
          open ? 'hidden' : 'flex',
        )}
      >
        <span className="relative flex size-5 items-center justify-center">
          <Headset className="size-5" aria-hidden />
          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-400 ring-2 ring-brand" />
        </span>
        <span className="hidden sm:inline">پشتیبانی آنلاین</span>
        {badge > 0 ? (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-brand">
            {badge > 99 ? '99+' : badge.toLocaleString('fa-IR')}
          </span>
        ) : null}
      </button>
    </>
  );
}
