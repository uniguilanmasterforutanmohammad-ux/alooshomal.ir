'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

import { api } from '@/lib/api';

interface BookingMessage {
  id: string;
  direction: string;
  channel: string;
  body: string;
  createdAt: string;
}

function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  const normalised = digits.startsWith('0')
    ? `98${digits.slice(1)}`
    : digits.startsWith('98')
      ? digits
      : digits;
  return `https://wa.me/${normalised}`;
}

export function BookingMessages({
  bookingId,
  guestPhone,
}: {
  bookingId: string;
  guestPhone?: string | null;
}) {
  const [items, setItems] = useState<BookingMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await api.get<BookingMessage[]>(
          `/accommodations/bookings/${bookingId}/messages`,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.post(`/accommodations/bookings/${bookingId}/messages`, {
        body: text,
        channel: 'NOTE',
        direction: 'OUT',
      });
      setBody('');
      await load();
    } catch {
      // API client already surfaced the failure message.
    } finally {
      setSending(false);
    }
  }

  const wa = whatsappHref(guestPhone);

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[var(--vintage-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-bold text-ink">
          <MessageCircle className="size-3.5" aria-hidden />
          پیام‌های مهمان
        </p>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold text-emerald-700"
          >
            گفتگو در واتساپ
          </a>
        ) : null}
      </div>
      {loading ? (
        <p className="text-[11px] text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-muted">هنوز پیامی ثبت نشده است.</p>
      ) : (
        <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] ${
                item.direction === 'IN'
                  ? 'self-start bg-[var(--vintage-paper)] text-ink'
                  : 'self-end bg-brand-light text-brand'
              }`}
            >
              <p className="whitespace-pre-wrap">{item.body}</p>
              <p className="mt-0.5 text-[9px] opacity-70">
                {new Date(item.createdAt).toLocaleString('fa-IR')}
              </p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea
          rows={2}
          className="w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
          placeholder="پیام یا یادداشت برای این رزرو…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="indeed-btn indeed-btn-primary shrink-0 text-xs disabled:opacity-50"
        >
          <Send className="size-3" aria-hidden />
          ارسال
        </button>
      </form>
    </div>
  );
}
