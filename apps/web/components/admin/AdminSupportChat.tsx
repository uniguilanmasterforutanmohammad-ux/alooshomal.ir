'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCheck,
  Headset,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  UserCheck,
} from 'lucide-react';

import {
  api,
  type SupportChatEvent,
  type SupportChatMessage,
  type SupportConversation,
} from '@/lib/api';
import { SUPPORT_POLL_MS } from '@/lib/support-chat';
import { cn } from '@/lib/utils';
import { AdminSupportSmsSettings } from './AdminSupportSmsSettings';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const STAFF_QUICK_REPLIES = [
  'سلام، در خدمتم.',
  'لطفاً تصویر یا اسکرین‌شات مشکل را ارسال کنید.',
  'در حال بررسی هستم، چند لحظه صبر کنید.',
  'مشکل برطرف شد؟',
];

type StatusFilter = 'OPEN' | 'CLOSED' | 'ALL';

function faDateTime(date: string) {
  return new Date(date).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Admin live-support inbox: a realtime conversation list on one side and the
// selected thread on the other. New messages arrive over SSE; the slow poll is
// only a safety net for a dropped stream.
export function AdminSupportChat() {
  const [items, setItems] = useState<SupportConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, []);

  const loadUnread = useCallback(async () => {
    try {
      const result = await api.get<{ unread: number; open: number }>(
        '/admin/support/chat/unread-count',
      );
      setUnread(result.unread);
    } catch {
      // keep the last count
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (appliedQ.trim()) params.set('q', appliedQ.trim());
      const result = await api.get<{ items: SupportConversation[] }>(
        `/admin/support/chat?${params.toString()}`,
      );
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری گفتگوها');
    } finally {
      setLoadingList(false);
    }
  }, [appliedQ, statusFilter]);

  const loadConversation = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const data = await api.get<SupportConversation>(
          `/admin/support/chat/${id}`,
        );
        setConversation(data);
        setError(null);
        if (data.staffUnread > 0) {
          await api.post(`/admin/support/chat/${id}/read`).catch(() => undefined);
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, staffUnread: 0 } : item,
            ),
          );
          void loadUnread();
        }
        requestAnimationFrame(scrollToBottom);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری گفتگو');
      } finally {
        setLoadingDetail(false);
      }
    },
    [loadUnread, scrollToBottom],
  );

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    void loadList();
    void loadUnread();
  }, [loadList, loadUnread]);

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      return;
    }
    void loadConversation(selectedId);
  }, [loadConversation, selectedId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadList();
      void loadUnread();
      if (selectedRef.current) void loadConversation(selectedRef.current);
    }, SUPPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversation, loadList, loadUnread]);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function connect() {
      try {
        const issued = await api.get<{ ticket: string }>(
          '/admin/support/chat/stream-ticket',
        );
        if (cancelled) return;
        source = new EventSource(
          `${API_URL}/admin/support/chat/stream?ticket=${encodeURIComponent(issued.ticket)}`,
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
          if (data.type === 'message' && data.message) {
            const current = selectedRef.current;
            if (current && current === data.conversationId) {
              setConversation((prev) => {
                if (!prev || prev.id !== data.conversationId) return prev;
                if (prev.messages?.some((item) => item.id === data.message!.id)) {
                  return prev;
                }
                return {
                  ...prev,
                  messages: [...(prev.messages ?? []), data.message!],
                  lastMessageAt: data.message!.createdAt,
                  lastMessagePreview: data.message!.body.slice(0, 120),
                };
              });
              if (data.message.senderRole === 'USER') {
                void api
                  .post(`/admin/support/chat/${current}/read`)
                  .catch(() => undefined);
              }
              requestAnimationFrame(scrollToBottom);
            }
            void loadList();
            void loadUnread();
            return;
          }
          if (data.type === 'status' || data.type === 'read') {
            void loadList();
            void loadUnread();
            if (selectedRef.current === data.conversationId) {
              void loadConversation(data.conversationId);
            }
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
  }, [loadConversation, loadList, loadUnread, scrollToBottom]);

  async function sendReply(event?: React.FormEvent) {
    event?.preventDefault();
    const text = reply.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.post<{
        conversation: SupportConversation;
        message: SupportChatMessage;
      }>(`/admin/support/chat/${selectedId}/messages`, { body: text });
      setConversation(result.conversation);
      setReply('');
      requestAnimationFrame(scrollToBottom);
      void loadList();
      void loadUnread();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پاسخ ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: 'OPEN' | 'CLOSED') {
    if (!selectedId) return;
    try {
      const updated = await api.patch<SupportConversation>(
        `/admin/support/chat/${selectedId}`,
        { status },
      );
      setConversation(updated);
      void loadList();
      void loadUnread();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    }
  }

  async function assignToMe() {
    if (!selectedId) return;
    try {
      const updated = await api.patch<SupportConversation>(
        `/admin/support/chat/${selectedId}`,
        { assignToMe: true },
      );
      setConversation(updated);
      void loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'واگذاری ناموفق بود');
    }
  }

  const messages = conversation?.messages ?? [];
  const closed = conversation?.status === 'CLOSED';

  return (
    <div className="flex flex-col gap-4">
      <AdminSupportSmsSettings />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <div className="indeed-panel flex max-h-[42rem] flex-col overflow-hidden">
        <div className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Headset className="size-4 text-brand" aria-hidden />
              صندوق پشتیبانی
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
              <span
                className={cn(
                  'size-2 rounded-full',
                  online ? 'bg-emerald-500' : 'bg-amber-400',
                )}
                aria-hidden
              />
              {online ? 'زنده' : 'اتصال...'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
              {unread.toLocaleString('fa-IR')} پیام تازه
            </span>
            <button
              type="button"
              onClick={() => {
                void loadList();
                void loadUnread();
              }}
              className="ms-auto flex size-7 items-center justify-center rounded-md border border-[var(--vintage-border)] text-muted hover:text-brand"
              aria-label="به‌روزرسانی"
            >
              <RefreshCw className="size-3.5" aria-hidden />
            </button>
          </div>
          <form
            className="mt-2 flex gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedQ(q);
            }}
          >
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="جستجوی نام، ایمیل یا پیام..."
              className="indeed-input h-9 flex-1 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="indeed-btn indeed-btn-secondary px-2 py-1 text-xs"
            >
              جستجو
            </button>
          </form>
          <div className="mt-2 flex gap-1">
            {(
              [
                ['OPEN', 'باز'],
                ['CLOSED', 'بسته'],
                ['ALL', 'همه'],
              ] as Array<[StatusFilter, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'rounded-md border px-2 py-1 text-[11px] font-bold transition',
                  statusFilter === value
                    ? 'border-brand bg-brand text-white'
                    : 'border-[var(--vintage-border)] text-muted hover:border-brand',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loadingList ? (
            <div className="flex justify-center p-6 text-muted">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </div>
          ) : items.length === 0 ? (
            <p className="p-4 text-center text-xs leading-6 text-muted">
              گفتگویی با این فیلتر وجود ندارد.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-right transition',
                        active
                          ? 'border-brand bg-brand-light'
                          : 'border-transparent hover:border-[var(--vintage-border)] hover:bg-soft',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-extrabold text-ink">
                          {item.user?.fullName ?? item.user?.email ?? 'کاربر'}
                        </span>
                        {item.staffUnread > 0 ? (
                          <span className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {item.staffUnread.toLocaleString('fa-IR')}
                          </span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-5 text-muted">
                        {item.lastMessagePreview ?? 'بدون پیام'}
                      </span>
                      <span className="flex items-center justify-between text-[10px] text-muted">
                        <span>{faDateTime(item.lastMessageAt)}</span>
                        <span
                          className={cn(
                            'font-bold',
                            item.status === 'OPEN'
                              ? 'text-emerald-600'
                              : 'text-slate-500',
                          )}
                        >
                          {item.status === 'OPEN' ? 'باز' : 'بسته'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="indeed-panel flex min-h-[42rem] flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="vintage-avatar flex size-14 items-center justify-center">
              <Headset className="size-6" aria-hidden />
            </span>
            <p className="text-sm font-bold text-ink">یک گفتگو را انتخاب کنید</p>
            <p className="max-w-sm text-xs leading-6 text-muted">
              پیام‌های کاربران به‌صورت زنده در این صندوق نمایش داده می‌شوند. برای
              پاسخ، گفتگوی موردنظر را از فهرست کنار باز کنید.
            </p>
          </div>
        ) : loadingDetail && !conversation ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </div>
        ) : conversation ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-ink">
                  {conversation.user?.fullName ??
                    conversation.user?.email ??
                    'کاربر'}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {conversation.user?.email ?? '—'}
                  {conversation.user?.phone
                    ? ` · ${conversation.user.phone}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-bold',
                    closed
                      ? 'border-slate-300 bg-slate-50 text-slate-600'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700',
                  )}
                >
                  {closed ? 'بسته' : 'باز'}
                </span>
                {conversation.assignedTo ? (
                  <span className="rounded-md border border-[var(--vintage-border)] px-2 py-0.5 text-[11px] text-muted">
                    واگذار به {conversation.assignedTo.fullName ?? 'مدیر'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={assignToMe}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--vintage-border)] px-2 py-0.5 text-[11px] font-bold text-muted hover:border-brand hover:text-brand"
                  >
                    <UserCheck className="size-3" aria-hidden />
                    واگذاری به من
                  </button>
                )}
                {closed ? (
                  <button
                    type="button"
                    onClick={() => changeStatus('OPEN')}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    <RefreshCw className="size-3" aria-hidden />
                    بازگشایی
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => changeStatus('CLOSED')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Lock className="size-3" aria-hidden />
                    بستن
                  </button>
                )}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[var(--vintage-paper)] px-4 py-4"
            >
              <div className="flex flex-col gap-3">
                {messages.map((message) => {
                  if (message.senderRole === 'SYSTEM') {
                    return (
                      <p
                        key={message.id}
                        className="mx-auto max-w-[85%] rounded-lg bg-soft px-3 py-2 text-center text-[11px] leading-6 text-muted"
                      >
                        {message.body}
                      </p>
                    );
                  }
                  const staff = message.senderRole === 'STAFF';
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex flex-col',
                        staff ? 'items-end' : 'items-start',
                      )}
                    >
                      <span className="mb-1 text-[10px] font-bold text-muted">
                        {staff
                          ? message.sender?.fullName ?? 'پشتیبانی'
                          : conversation.user?.fullName ?? 'کاربر'}
                      </span>
                      <div
                        className={cn(
                          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm',
                          staff
                            ? 'rounded-br-md bg-brand text-white'
                            : 'rounded-bl-md border border-[var(--vintage-border)] bg-white text-ink',
                        )}
                      >
                        {message.body}
                      </div>
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                        {timeLabel(message.createdAt)}
                        {staff && message.readAt ? (
                          <CheckCheck
                            className="size-3 text-emerald-500"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}

            {closed ? (
              <div className="border-t-2 border-dashed border-[var(--vintage-accent-hover)] p-3 text-center text-xs text-muted">
                این گفتگو بسته است. برای پاسخ، آن را بازگشایی کنید.
              </div>
            ) : (
              <form
                onSubmit={sendReply}
                className="border-t-2 border-dashed border-[var(--vintage-accent-hover)] p-3"
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {STAFF_QUICK_REPLIES.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setReply(text)}
                      className="rounded-full border border-[var(--vintage-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-brand"
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendReply();
                      }
                    }}
                    rows={2}
                    maxLength={4000}
                    placeholder="پاسخ خود را بنویسید..."
                    className="indeed-input max-h-32 min-h-11 flex-1 resize-none py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="indeed-btn indeed-btn-primary size-11 shrink-0 p-0"
                    aria-label="ارسال پاسخ"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Send className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
            گفتگو بارگذاری نشد.
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
