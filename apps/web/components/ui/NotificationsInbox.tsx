'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCheck } from 'lucide-react';

import { api, type AppNotification, type NotificationPage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';

interface Props {
  /** admin panel shows the shared ADMIN feed */
  scope?: 'user' | 'admin';
  /** rewrite an individual notification link (e.g. /admin?section=… → /moderator?scope=…) */
  linkMapper?: (link: string) => string;
}

const typeStyles: Record<AppNotification['type'], string> = {
  INFO: 'border-s-sky-400 bg-sky-50 text-sky-700',
  SUCCESS: 'border-s-emerald-400 bg-emerald-50 text-emerald-700',
  WARNING: 'border-s-amber-400 bg-amber-50 text-amber-700',
  ERROR: 'border-s-red-400 bg-red-50 text-red-700',
};

/**
 * Full notification history (read + unread, newest first) with pagination.
 * This is the page the bell's "مشاهده تمامی اعلانات" link opens; the bell
 * popover itself only lists unread items.
 */
export function NotificationsInbox({ scope = 'user', linkMapper }: Props) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pagePath =
    scope === 'admin' ? '/admin/notifications/page' : '/notifications/mine/page';
  const readOnePath = (id: string) =>
    scope === 'admin'
      ? `/admin/notifications/${id}/read`
      : `/notifications/mine/${id}/read`;
  const readAllPath = scope === 'admin' ? '/admin/notifications/read-all' : '/notifications/mine/read-all';

  const load = useCallback(
    async (target: number) => {
      try {
        const result = await api.get<NotificationPage>(
          `${pagePath}?page=${target}&limit=20`,
        );
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری اعلانات');
      } finally {
        setLoading(false);
      }
    },
    [pagePath],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  async function markOne(id: string, link: string | null) {
    try {
      await api.patch(readOnePath(id));
    } catch {
      /* ignore */
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            unread: Math.max(0, prev.unread - 1),
            items: prev.items.map((item) =>
              item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
            ),
          }
        : prev,
    );
    return link;
  }

  async function markAll() {
    try {
      await api.patch(readAllPath);
      await load(page);
    } catch {
      /* ignore */
    }
  }

  const unread = data?.unread ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">اعلانات</h2>
          <p className="text-sm text-muted">
            تاریخچه‌ی کامل اعلانات شما — خوانده‌شده و خوانده‌نشده، از جدید به قدیم.
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            <CheckCheck className="size-4" aria-hidden />
            خواندن همه
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel overflow-hidden">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">اعلانی وجود ندارد.</p>
        ) : (
          data.items.map((item) => {
            const href = item.link ? (linkMapper?.(item.link) ?? item.link) : null;
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
            return href ? (
              <Link
                key={item.id}
                href={href}
                onClick={() => void markOne(item.id, item.link)}
                className={cn(
                  'block border-s-4 border-b border-b-[var(--vintage-border)] px-4 py-3 transition hover:bg-soft',
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
                  'block w-full border-s-4 border-b border-b-[var(--vintage-border)] px-4 py-3 text-right transition hover:bg-soft',
                  item.readAt ? 'border-s-transparent bg-white' : typeStyles[item.type],
                )}
              >
                {content}
              </button>
            );
          })
        )}
      </div>

      {data ? <Pagination meta={data.meta} onPage={setPage} /> : null}
    </div>
  );
}
