'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquarePlus } from 'lucide-react';

import { api, type SupportConversation } from '@/lib/api';
import { SUPPORT_POLL_MS } from '@/lib/support-chat';
import { cn } from '@/lib/utils';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Bump to reload the list immediately after a new message/conversation. */
  refreshKey?: number;
}

function faDateTime(date: string) {
  return new Date(date).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Sidebar list of the user's support conversations (open + past). */
export function SupportChatHistory({ selectedId, onSelect, refreshKey = 0 }: Props) {
  const [items, setItems] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ items: SupportConversation[] }>(
        '/support/chat/me/conversations?limit=30',
      );
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری سابقه');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, SUPPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="indeed-panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-4 py-3">
        <h3 className="text-sm font-extrabold text-ink">گفتگوهای من</h3>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vintage-border)] px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand-light"
        >
          <MessageSquarePlus className="size-3.5" aria-hidden />
          گفتگوی جدید
        </button>
      </div>

      <div className="max-h-[34rem] flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center p-6 text-muted">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </div>
        ) : error ? (
          <p className="p-3 text-xs text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-xs leading-6 text-muted">
            هنوز گفتگویی ندارید. با دکمه‌ی «گفتگوی جدید» اولین پیام را بفرستید.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-right transition',
                      active
                        ? 'border-brand bg-brand-light'
                        : 'border-transparent hover:border-[var(--vintage-border)] hover:bg-soft',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            item.status === 'OPEN' ? 'bg-emerald-500' : 'bg-slate-400',
                          )}
                          aria-hidden
                        />
                        {item.status === 'OPEN' ? 'باز' : 'بسته'}
                      </span>
                      <span className="text-[10px] text-muted">
                        {faDateTime(item.lastMessageAt)}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs leading-5 text-muted">
                      {item.lastMessagePreview ?? 'بدون پیام'}
                    </span>
                    {item.userUnread > 0 ? (
                      <span className="self-start rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                        {item.userUnread.toLocaleString('fa-IR')} پیام تازه
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
