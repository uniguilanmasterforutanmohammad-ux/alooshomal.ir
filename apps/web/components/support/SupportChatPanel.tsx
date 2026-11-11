'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCheck,
  Headset,
  Loader2,
  MessageSquarePlus,
  Send,
  X,
} from 'lucide-react';

import {
  api,
  type SupportChatEvent,
  type SupportChatMessage,
  type SupportConversation,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const QUICK_REPLIES = [
  'در ورود به حساب مشکل دارم',
  'سؤال درباره‌ی اشتراک دارم',
  'مشکل در پرداخت',
  'راهنمایی برای ساخت کارت ویزیت',
];

interface Props {
  variant?: 'widget' | 'page';
  /** When set, the panel opens this conversation instead of the current one. */
  conversationId?: string | null;
  /** Start from a blank thread (the first message creates a new conversation). */
  fresh?: boolean;
  onClose?: () => void;
  /** Fired after a new conversation is created or the selected one changes. */
  onConversationChange?: (conversation: SupportConversation | null) => void;
  className?: string;
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayLabel(date: string) {
  return new Date(date).toLocaleDateString('fa-IR', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Live support conversation view. It is shared by the floating widget and the
 * full `/dashboard/support` page: messages arrive over SSE, sending is a normal
 * authenticated POST, and a slow poll only covers a dropped stream.
 */
export function SupportChatPanel({
  variant = 'widget',
  conversationId,
  fresh = false,
  onClose,
  onConversationChange,
  className,
}: Props) {
  const { token, hydrated } = useAuth();
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<SupportConversation | null>(null);
  // Set while the user asked for a blank thread, so an in-flight load cannot
  // put the previous (closed) conversation back on screen.
  const freshRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, []);

  const applyConversation = useCallback(
    (next: SupportConversation | null) => {
      if (next) freshRef.current = false;
      setConversation(next);
      setMessages(next?.messages ?? []);
      onConversationChange?.(next);
      requestAnimationFrame(scrollToBottom);
    },
    [onConversationChange, scrollToBottom],
  );

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (fresh || freshRef.current) {
      setConversation(null);
      setMessages([]);
      setLoading(false);
      return;
    }
    // Only the first load shows the spinner; background polls must keep the
    // existing messages on screen (otherwise the thread visibly blinks).
    if (!conversationRef.current) setLoading(true);
    try {
      const data = conversationId
        ? await api.get<SupportConversation>(
            `/support/chat/me/conversations/${conversationId}`,
          )
        : await api.get<SupportConversation | null>('/support/chat/me');
      applyConversation(data);
      setError(null);
      // Only a *new* unread message needs a read receipt. Calling this on every
      // load emitted a read event that triggered another load (flicker loop).
      if (data?.status === 'OPEN' && data.userUnread > 0) {
        void api
          .post(`/support/chat/me/conversations/${data.id}/read`)
          .catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری گفتگو');
    } finally {
      setLoading(false);
    }
  }, [applyConversation, conversationId, fresh, token]);

  useEffect(() => {
    if (!hydrated) return;
    void load();
  }, [hydrated, load]);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    if (conversationId) freshRef.current = false;
  }, [conversationId]);

  // Slow fallback so a dropped stream can never leave the thread stale.
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 20_000);
    return () => clearInterval(timer);
  }, [load, token]);

  // Live stream: EventSource cannot send the bearer header, so we mint a
  // short-lived single-use ticket over the normal authenticated API first.
  useEffect(() => {
    if (!token) return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function connect() {
      try {
        const issued = await api.get<{ ticket: string }>(
          '/support/chat/me/stream-ticket',
        );
        if (cancelled) return;
        source = new EventSource(
          `${API_URL}/support/chat/me/stream?ticket=${encodeURIComponent(issued.ticket)}`,
        );
        source.onopen = () => setOnline(true);
        source.onmessage = (event) => {
          let data: SupportChatEvent;
          try {
            data = JSON.parse(event.data) as SupportChatEvent;
          } catch {
            return;
          }
          if (data.type === 'ready') {
            setOnline(true);
            return;
          }
          const current = conversationRef.current;
          if (data.type === 'message' && data.message) {
            if (!current || current.id !== data.conversationId) {
              void load();
              return;
            }
            setMessages((prev) =>
              prev.some((item) => item.id === data.message!.id)
                ? prev
                : [...prev, data.message!],
            );
            if (data.message.senderRole === 'STAFF') {
              void api
                .post(`/support/chat/me/conversations/${current.id}/read`)
                .catch(() => undefined);
            }
            requestAnimationFrame(scrollToBottom);
            return;
          }
          if (data.type === 'status') {
            if (!current || current.id === data.conversationId) void load();
          }
        };
        source.onerror = () => {
          setOnline(false);
          source?.close();
          source = null;
          if (!cancelled) retry = setTimeout(connect, 5_000);
        };
      } catch {
        if (!cancelled) retry = setTimeout(connect, 8_000);
      }
    }

    void connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [load, scrollToBottom, token]);

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.post<{
        conversation: SupportConversation;
        message: SupportChatMessage;
      }>('/support/chat/me/messages', {
        body: text,
        // A closed thread is left behind: omitting the id starts a new chat.
        ...(conversation?.status === 'OPEN'
          ? { conversationId: conversation.id }
          : {}),
      });
      setBody('');
      applyConversation(result.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  function startNew() {
    freshRef.current = true;
    setConversation(null);
    setMessages([]);
    setBody('');
    onConversationChange?.(null);
  }

  const isPage = variant === 'page';
  const closed = conversation?.status === 'CLOSED';

  if (hydrated && !token) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-8 text-center',
          className,
        )}
      >
        <span className="vintage-avatar flex size-14 items-center justify-center">
          <Headset className="size-6" aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-extrabold text-ink">پشتیبانی آنلاین</h3>
          <p className="mt-2 text-sm leading-7 text-muted">
            برای گفتگوی زنده با واحد پشتیبانی، ابتدا وارد حساب خود شوید.
          </p>
        </div>
        <Link href="/login" className="indeed-btn indeed-btn-primary text-sm">
          ورود به حساب
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] px-4 py-3">
        <span className="vintage-avatar flex size-10 shrink-0 items-center justify-center">
          <Headset className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-ink">پشتیبانی آنلاین</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className={cn(
                'size-2 rounded-full',
                online ? 'bg-emerald-500' : 'bg-amber-400',
              )}
              aria-hidden
            />
            {online ? 'متصل — پاسخ‌گویی زنده' : 'در حال اتصال...'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-soft"
            aria-label="بستن گفتگو"
          >
            <X className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto bg-[var(--vintage-paper)] px-3 py-4',
          isPage ? 'min-h-[26rem]' : 'h-80',
        )}
      >
        {loading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="vintage-avatar flex size-12 items-center justify-center">
              <Headset className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-bold text-ink">به پشتیبانی آنلاین خوش آمدید</p>
            <p className="text-xs leading-6 text-muted">
              پیام خود را بنویسید؛ گفتگو به‌صورت زنده برای واحد پشتیبانی باز می‌شود.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay =
                !previous ||
                new Date(previous.createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();
              if (message.senderRole === 'SYSTEM') {
                return (
                  <div key={message.id} className="flex flex-col gap-3">
                    {newDay ? (
                      <p className="text-center text-[10px] font-bold text-muted">
                        {dayLabel(message.createdAt)}
                      </p>
                    ) : null}
                    <p className="mx-auto max-w-[85%] rounded-lg bg-soft px-3 py-2 text-center text-[11px] leading-6 text-muted">
                      {message.body}
                    </p>
                  </div>
                );
              }
              const mine = message.senderRole === 'USER';
              return (
                <div key={message.id} className="flex flex-col gap-3">
                  {newDay ? (
                    <p className="text-center text-[10px] font-bold text-muted">
                      {dayLabel(message.createdAt)}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      'flex flex-col',
                      mine ? 'items-start' : 'items-end',
                    )}
                  >
                    {!mine ? (
                      <span className="mb-1 text-[10px] font-bold text-brand">
                        {message.sender?.fullName ?? 'پشتیبانی'}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm',
                        mine
                          ? 'rounded-bl-md bg-brand text-white'
                          : 'rounded-br-md border border-[var(--vintage-border)] bg-white text-ink',
                      )}
                    >
                      {message.body}
                    </div>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                      {timeLabel(message.createdAt)}
                      {mine && message.readAt ? (
                        <CheckCheck className="size-3 text-emerald-500" aria-hidden />
                      ) : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error ? (
        <p className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {closed ? (
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] p-3">
          <p className="text-center text-xs text-muted">
            این گفتگو بسته شده است. برای ادامه، گفتگوی تازه‌ای شروع کنید.
          </p>
          <button
            type="button"
            onClick={startNew}
            className="indeed-btn indeed-btn-primary py-2 text-sm"
          >
            <MessageSquarePlus className="size-4" aria-hidden />
            شروع گفتگوی جدید
          </button>
        </div>
      ) : (
        <form
          onSubmit={send}
          className="border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] p-3"
        >
          {messages.length === 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setBody(reply)}
                  className="rounded-full border border-[var(--vintage-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-brand"
                >
                  {reply}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={isPage ? 3 : 2}
              maxLength={4000}
              placeholder="پیام خود را بنویسید..."
              className="indeed-input max-h-32 min-h-11 flex-1 resize-none py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="indeed-btn indeed-btn-primary size-11 shrink-0 p-0"
              aria-label="ارسال پیام"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted">
            Enter برای ارسال · Shift+Enter برای خط جدید
          </p>
        </form>
      )}
    </div>
  );
}
