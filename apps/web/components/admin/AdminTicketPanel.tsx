'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TicketMessage {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author?: { id: string; email: string; fullName: string | null; role?: string } | null;
}

interface TicketFull {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; fullName: string | null } | null;
  messages?: TicketMessage[];
}

const statusLabel: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  CLOSED: 'بسته',
};

const priorityLabel: Record<string, string> = {
  LOW: 'کم',
  NORMAL: 'عادی',
  HIGH: 'زیاد',
};

function faDateTime(date: string) {
  return new Date(date).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

interface Props {
  ticketId: string;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * Admin ticket workspace: read the full conversation, reply, and change the
 * ticket status. Opened by clicking a ticket row in the dashboard.
 */
export function AdminTicketPanel({ ticketId, onClose, onUpdated }: Props) {
  const [ticket, setTicket] = useState<TicketFull | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<TicketFull>(`/admin/tickets/${ticketId}`);
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
      await api.post(`/admin/tickets/${ticketId}/reply`, { message: reply });
      setReply('');
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پاسخ ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: TicketFull['status']) {
    setError(null);
    try {
      await api.patch(`/admin/tickets/${ticketId}`, { status });
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
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

  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] p-4">
        <div>
          <h3 className="text-base font-extrabold text-ink">{ticket.subject}</h3>
          <p className="mt-1 text-xs text-muted">
            {ticket.user?.fullName ?? ticket.user?.email ?? 'کاربر مهمان'} · اولویت:{' '}
            {priorityLabel[ticket.priority]} · {faDateTime(ticket.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1.5 text-xs font-bold"
            value={ticket.status}
            onChange={(event) => changeStatus(event.target.value as TicketFull['status'])}
          >
            <option value="OPEN">باز</option>
            <option value="IN_PROGRESS">در حال بررسی</option>
            <option value="CLOSED">بسته</option>
          </select>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-ink hover:bg-soft"
            aria-label="بستن"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto p-4">
        {(ticket.messages ?? []).map((message) => (
          <div
            key={message.id}
            className={cn(
              'max-w-[85%] rounded-xl border p-3 text-sm leading-7',
              message.isStaff
                ? 'self-start border-[var(--vintage-border)] bg-white'
                : 'self-end border-brand/40 bg-brand-light text-ink',
            )}
          >
            <p className="mb-1 text-[11px] font-bold text-muted">
              {message.isStaff ? 'پشتیبانی' : ticket.user?.fullName ?? 'کاربر'} ·{' '}
              {faDateTime(message.createdAt)}
            </p>
            <p className="whitespace-pre-line">{message.body}</p>
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
          placeholder="پاسخ خود را بنویسید..."
        />
        <button
          type="submit"
          disabled={sending || !reply.trim()}
          className="indeed-btn indeed-btn-primary"
        >
          <Send className="size-4" aria-hidden />
          ارسال
        </button>
      </form>
    </div>
  );
}
