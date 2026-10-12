'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, MessageSquare, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
  isActive: boolean;
  deactivatedReason?: string | null;
  adminComment?: string | null;
  createdAt: string;
  _count?: { biolinks: number };
}

export interface AdminTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  createdAt: string;
  user?: { email: string; fullName: string | null } | null;
}

export interface AdminReport {
  id: string;
  title: string;
  type: string;
  status: 'READY' | 'PROCESSING' | 'FAILED';
  sizeBytes: number | null;
  generatedAt: string;
}

function fa(date: string) {
  return new Date(date).toLocaleDateString('fa-IR');
}

const ticketBadge: Record<string, string> = {
  OPEN: 'badge-open',
  IN_PROGRESS: 'badge-progress',
  CLOSED: 'badge-closed',
};

const ticketLabel: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  CLOSED: 'بسته',
};

const reportBadge: Record<string, string> = {
  READY: 'badge-open',
  PROCESSING: 'badge-progress',
  FAILED: 'badge-closed',
};

const reportLabel: Record<string, string> = {
  READY: 'آماده',
  PROCESSING: 'در حال پردازش',
  FAILED: 'ناموفق',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function UsersTable({
  users,
  onViewAll,
  onToggleActive,
  onDelete,
  onComment,
  onRole,
  title = 'لیست کاربران اخیر',
}: {
  users: AdminUser[];
  onViewAll?: () => void;
  onToggleActive?: (id: string, isActive: boolean, reason?: string) => void;
  onDelete?: (id: string) => void;
  onComment?: (id: string, comment: string) => void;
  onRole?: (id: string, role: AdminUser['role']) => void;
  title?: string;
}) {
  const [commentFor, setCommentFor] = useState<AdminUser | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const manageable = Boolean(onToggleActive || onDelete || onComment || onRole);

  function askDeactivate(user: AdminUser) {
    const reason = window.prompt('علت غیرفعال‌سازی حساب کاربری را وارد کنید:');
    if (reason === null) return;
    if (!reason.trim()) {
      window.alert('ذکر علت برای غیرفعال‌سازی الزامی است.');
      return;
    }
    onToggleActive?.(user.id, false, reason.trim());
  }

  function confirmDelete(user: AdminUser) {
    if (
      window.confirm(
        `حذف کامل کاربر «${user.fullName ?? user.email}»؟ این عملیات بازگشت‌پذیر نیست.`,
      )
    ) {
      onDelete?.(user.id);
    }
  }

  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-brand hover:underline"
          >
            مشاهده همه
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-[#fbf3e9] text-xs text-muted">
              <th className="px-4 py-2.5 font-bold">نام</th>
              <th className="px-4 py-2.5 font-bold">ایمیل</th>
              <th className="px-4 py-2.5 font-bold">نقش</th>
              <th className="px-4 py-2.5 font-bold">تاریخ عضویت</th>
              <th className="px-4 py-2.5 font-bold">وضعیت</th>
              {manageable ? <th className="px-4 py-2.5 font-bold">عملیات</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[var(--vintage-border)]">
                <td className="px-4 py-2.5 font-semibold text-ink">
                  {user.fullName ?? '—'}
                  {user.adminComment ? (
                    <span
                      title={user.adminComment}
                      className="ms-1 text-[10px] text-amber-600"
                    >
                      ◆
                    </span>
                  ) : null}
                </td>
                <td dir="ltr" className="px-4 py-2.5 text-right text-xs text-muted">
                  {user.email}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {onRole ? (
                    <select
                      value={user.role}
                      onChange={(event) =>
                        onRole(user.id, event.target.value as AdminUser['role'])
                      }
                      className="rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1 text-xs font-bold text-ink"
                    >
                      <option value="USER">کاربر</option>
                      <option value="CITIZEN_REPORTER">شهروند خبرنگار</option>
                      {user.role === 'ADMIN' ? (
                        <option value="ADMIN" disabled>
                          مدیر
                        </option>
                      ) : null}
                    </select>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">{fa(user.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <Badge className={user.isActive ? 'badge-open' : 'badge-closed'}>
                    {user.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </td>
                {manageable ? (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      {onToggleActive ? (
                        user.isActive ? (
                          <button
                            type="button"
                            onClick={() => askDeactivate(user)}
                            title="غیرفعال‌سازی"
                            className="flex size-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                          >
                            <Ban className="size-3.5" aria-hidden />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleActive(user.id, true)}
                            title="فعال‌سازی"
                            className="flex size-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden />
                          </button>
                        )
                      ) : null}
                      {onComment ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCommentFor(user);
                            setCommentDraft(user.adminComment ?? '');
                          }}
                          title="کامنت مدیر"
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--vintage-border)] bg-white text-muted hover:bg-soft"
                        >
                          <MessageSquare className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => confirmDelete(user)}
                          title="حذف کاربر"
                          className="flex size-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={manageable ? 6 : 5} className="px-4 py-8 text-center text-muted">
                  کاربری یافت نشد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {commentFor ? (
        <div className="border-t border-dashed border-[var(--vintage-border)] p-4">
          <p className="mb-2 text-xs font-bold text-muted">
            کامنت مدیر درباره «{commentFor.fullName ?? commentFor.email}»
          </p>
          <textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[var(--vintage-border)] bg-white p-2 text-sm outline-none focus:border-brand"
            placeholder="یادداشت داخلی (فقط مدیران مشاهده می‌کنند)..."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onComment?.(commentFor.id, commentDraft.trim());
                setCommentFor(null);
              }}
              className="indeed-btn indeed-btn-primary py-1.5 text-xs"
            >
              ذخیره کامنت
            </button>
            <button
              type="button"
              onClick={() => setCommentFor(null)}
              className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TicketsTable({
  tickets,
  onStatus,
  onOpen,
  onViewAll,
  title = 'تیکت‌های اخیر',
}: {
  tickets: AdminTicket[];
  onStatus: (id: string, status: AdminTicket['status']) => void;
  onOpen?: (id: string) => void;
  onViewAll?: () => void;
  title?: string;
}) {
  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-brand hover:underline"
          >
            مشاهده همه
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-[#fbf3e9] text-xs text-muted">
              <th className="px-4 py-2.5 font-bold">موضوع</th>
              <th className="px-4 py-2.5 font-bold">کاربر</th>
              <th className="px-4 py-2.5 font-bold">وضعیت</th>
              <th className="px-4 py-2.5 font-bold">تاریخ</th>
              <th className="px-4 py-2.5 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className={cn(
                  'border-t border-[var(--vintage-border)]',
                  onOpen && 'cursor-pointer hover:bg-soft',
                )}
                onClick={onOpen ? () => onOpen(ticket.id) : undefined}
              >
                <td className="px-4 py-2.5 font-semibold text-ink">
                  {onOpen ? (
                    <button
                      type="button"
                      className="text-right text-brand hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(ticket.id);
                      }}
                    >
                      {ticket.subject}
                    </button>
                  ) : (
                    ticket.subject
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {ticket.user?.fullName ?? ticket.user?.email ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  <Badge className={ticketBadge[ticket.status]}>
                    {ticketLabel[ticket.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">{fa(ticket.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <select
                    className="rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1 text-xs"
                    value={ticket.status}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onStatus(ticket.id, event.target.value as AdminTicket['status'])
                    }
                  >
                    <option value="OPEN">باز</option>
                    <option value="IN_PROGRESS">در حال بررسی</option>
                    <option value="CLOSED">بسته</option>
                  </select>
                </td>
              </tr>
            ))}
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  تیکتی وجود ندارد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportsTable({
  reports,
  onViewAll,
}: {
  reports: AdminReport[];
  onViewAll?: () => void;
}) {
  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
        <h3 className="text-sm font-extrabold text-ink">گزارش‌های سیستم</h3>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-brand hover:underline"
          >
            مشاهده همه
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-[#fbf3e9] text-xs text-muted">
              <th className="px-4 py-2.5 font-bold">عنوان گزارش</th>
              <th className="px-4 py-2.5 font-bold">تاریخ تولید</th>
              <th className="px-4 py-2.5 font-bold">وضعیت</th>
              <th className="px-4 py-2.5 font-bold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t border-[var(--vintage-border)]">
                <td className="px-4 py-2.5 font-semibold text-ink">{report.title}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{fa(report.generatedAt)}</td>
                <td className="px-4 py-2.5">
                  <Badge className={reportBadge[report.status]}>
                    {reportLabel[report.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-md border border-[var(--vintage-border)] px-2 py-1 text-[11px] font-bold text-muted">
                    دانلود
                  </span>
                </td>
              </tr>
            ))}
            {reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  گزارشی وجود ندارد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
