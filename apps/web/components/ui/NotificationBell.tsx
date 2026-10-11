'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';

import { api, type AppNotification, type NotificationFeed } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  /** admin panel uses the shared ADMIN feed */
  scope?: 'user' | 'admin';
}

const POLL_MS = 30000;

const typeStyles: Record<AppNotification['type'], string> = {
  INFO: 'border-s-sky-400 bg-sky-50 text-sky-700',
  SUCCESS: 'border-s-emerald-400 bg-emerald-50 text-emerald-700',
  WARNING: 'border-s-amber-400 bg-amber-50 text-amber-700',
  ERROR: 'border-s-red-400 bg-red-50 text-red-700',
};

export function NotificationBell({ scope = 'user' }: Props) {
  const [feed, setFeed] = useState<NotificationFeed>({ items: [], unread: 0, total: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const listPath = scope === 'admin' ? '/admin/notifications' : '/notifications/mine';

  const load = useCallback(async () => {
    try {
      const data = await api.get<NotificationFeed>(`${listPath}?limit=20`);
      setFeed(data);
    } catch {
      // unauthenticated or transient — keep the last feed
    }
  }, [listPath]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAll() {
    try {
      await api.patch(
        scope === 'admin' ? '/admin/notifications/read-all' : '/notifications/mine/read-all',
      );
      await load();
    } catch {
      /* ignore */
    }
  }

  async function markOne(id: string, link: string | null) {
    try {
      await api.patch(
        scope === 'admin'
          ? `/admin/notifications/${id}/read`
          : `/notifications/mine/${id}/read`,
      );
    } catch {
      /* ignore */
    }
    setFeed((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
      items: prev.items.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    }));
    if (link) setOpen(false);
  }

  const unread = feed.unread;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="اعلانات"
        className="relative flex size-10 items-center justify-center rounded-lg border border-[var(--vintage-border)] bg-white transition hover:border-brand"
      >
        <Bell className="size-5 text-ink" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -end-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread.toLocaleString('fa-IR')}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute end-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-[var(--vintage-border)] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-dashed border-[var(--vintage-border)] px-4 py-2.5">
            <span className="text-sm font-extrabold text-ink">اعلانات</span>
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              خواندن همه
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {feed.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">اعلانی وجود ندارد.</p>
            ) : (
              feed.items.map((item) => {
                const content = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink">{item.title}</p>
                      {!item.readAt ? (
                        <span className="size-2 shrink-0 rounded-full bg-brand" />
                      ) : null}
                    </div>
                    {item.body ? (
                      <p className="mt-1 text-xs text-muted">{item.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted">
                      {new Date(item.createdAt).toLocaleString('fa-IR')}
                    </p>
                  </>
                );
                return item.link ? (
                  <Link
                    key={item.id}
                    href={item.link}
                    onClick={() => void markOne(item.id, item.link)}
                    className={cn(
                      'block border-s-4 px-4 py-3 transition hover:bg-soft',
                      item.readAt ? 'border-s-transparent bg-white' : typeStyles[item.type],
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void markOne(item.id, null)}
                    className={cn(
                      'block w-full border-s-4 px-4 py-3 text-right transition hover:bg-soft',
                      item.readAt ? 'border-s-transparent bg-white' : typeStyles[item.type],
                    )}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
