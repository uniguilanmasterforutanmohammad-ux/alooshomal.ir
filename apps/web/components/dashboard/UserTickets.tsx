'use client';

import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, MessageSquarePlus, Send, X } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface TicketMessage {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author?: { id: string; email: string; fullName: string | null; role?: string } | null;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; fullName: string | null } | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
}

export const ticketStatusLabel: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  CLOSED: 'بسته',
};

const ticketStatusClass: Record<string, string> = {
  OPEN: 'badge-open',
  IN_PROGRESS: 'badge-progress',
  CLOSED: 'badge-closed',
};

const priorityLabel: Record<string, string> = {
  LOW: 'کم',
  NORMAL: 'عادی',
  HIGH: 'زیاد',
};

function fa(date: string) {
  return new Date(date).toLocaleDateString('fa-IR');
}

function faDateTime(date: string) {
  return new Date(date).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold',
        ticketStatusClass[status] ?? 'badge-closed',
      )}
    >
      {ticketStatusLabel[status] ?? status}
    </span>
  );
}

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTicketDialog({ open, onClose, onCreated }: CreateProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setPriority('NORMAL');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/tickets', { subject, message, priority });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تیکت ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="indeed-panel w-full max-w-lg overflow-hidden bg-[#fbf3e9]"
      >
        <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] p-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="size-5 text-brand" aria-hidden />
            <h3 className="text-base font-extrabold text-ink">ثبت تیکت پشتیبانی</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full hover:bg-soft"
            aria-label="بستن"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <Input
            label="موضوع"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="خلاصه‌ای از مشکل یا درخواست"
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">توضیحات</span>
            <textarea
              className="indeed-input min-h-28 resize-y"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="جزئیات موضوع را بنویسید..."
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-ink">اولویت</span>
            <select
              className="indeed-input"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as 'LOW' | 'NORMAL' | 'HIGH')
              }
            >
              <option value="LOW">کم</option>
              <option value="NORMAL">عادی</option>
              <option value="HIGH">زیاد</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}
        </div>

        <div className="flex gap-3 border-t-2 border-dashed border-[var(--vintage-accent-hover)] p-4">
          <button type="submit" disabled={submitting} className="indeed-btn indeed-btn-primary flex-1">
            <Send className="size-4" aria-hidden />
            {submitting ? 'در حال ارسال...' : 'ارسال تیکت'}
          </button>
          <button type="button" onClick={onClose} className="indeed-btn indeed-btn-secondary">
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
}

interface DetailProps {
  ticketId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function TicketDetail({ ticketId, onClose, onUpdated }: DetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Ticket>(`/tickets/mine/${ticketId}`);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تیکت');
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.post(`/tickets/mine/${ticketId}/reply`, { message: reply });
      setReply('');
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پاسخ ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  if (!ticket && !error) {
    return <p className="p-8 text-center text-muted">در حال بارگذاری تیکت...</p>;
  }

  if (!ticket) {
    return (
      <div className="indeed-panel p-6">
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        <button onClick={onClose} className="indeed-btn indeed-btn-secondary mt-4">
          بستن
        </button>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED';

  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] p-4">
        <div>
          <h3 className="text-base font-extrabold text-ink">{ticket.subject}</h3>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            <TicketStatusBadge status={ticket.status} />
            <span>اولویت: {priorityLabel[ticket.priority]}</span>
            <span>· {faDateTime(ticket.createdAt)}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full text-ink hover:bg-soft"
          aria-label="بستن"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto p-4">
        {(ticket.messages ?? []).map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[85%] rounded-xl border p-3 text-sm leading-7',
              msg.isStaff
                ? 'self-start border-[var(--vintage-border)] bg-white'
                : 'self-end border-brand/40 bg-brand-light text-ink',
            )}
          >
            <p className="mb-1 text-[11px] font-bold text-muted">
              {msg.isStaff ? 'پشتیبانی' : 'شما'} · {faDateTime(msg.createdAt)}
            </p>
            <p className="whitespace-pre-line">{msg.body}</p>
          </div>
        ))}
        {(ticket.messages ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted">پیامی ثبت نشده است.</p>
        ) : null}
      </div>

      {error ? (
        <p className="mx-4 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <form
        onSubmit={sendReply}
        className="flex items-end gap-2 border-t-2 border-dashed border-[var(--vintage-accent-hover)] p-4"
      >
        <textarea
          className="indeed-input min-h-12 flex-1 resize-y"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder={closed ? 'این تیکت بسته شده است' : 'پاسخ خود را بنویسید...'}
          disabled={closed}
        />
        <button
          type="submit"
          disabled={sending || closed || !reply.trim()}
          className="indeed-btn indeed-btn-primary"
        >
          <Send className="size-4" aria-hidden />
          ارسال
        </button>
      </form>
    </div>
  );
}

interface ListProps {
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}

export function MyTicketsList({ onSelect, onNew, refreshKey }: ListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: Ticket[] }>('/tickets/mine?limit=50')
      .then((data) => setTickets(data.items))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-brand" aria-hidden />
          <h3 className="text-sm font-extrabold text-ink">تیکت‌های من</h3>
        </div>
        <button onClick={onNew} className="indeed-btn indeed-btn-primary py-1.5 text-xs">
          <MessageSquarePlus className="size-3.5" aria-hidden />
          تیکت جدید
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-center text-sm text-muted">در حال بارگذاری...</p>
      ) : tickets.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">
          هنوز تیکتی ثبت نکرده‌اید.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--vintage-border)]">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                onClick={() => onSelect(ticket.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-right transition hover:bg-soft"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{ticket.subject}</p>
                  <p className="text-xs text-muted">
                    {fa(ticket.updatedAt)} ·{' '}
                    {ticket._count?.messages ?? 0} پیام
                  </p>
                </div>
                <TicketStatusBadge status={ticket.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
