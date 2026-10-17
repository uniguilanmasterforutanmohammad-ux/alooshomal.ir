'use client';

import { useCallback, useEffect, useState } from 'react';
import { Laptop, LogOut, MonitorSmartphone, ShieldCheck, Smartphone } from 'lucide-react';

import { api } from '@/lib/api';
import { Pagination, type PaginationMeta } from '@/components/ui/Pagination';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface SessionRow {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
  idleExpiresAt: string;
}

interface SessionsResponse {
  items: SessionRow[];
  meta: PaginationMeta;
}

/** Very rough UA → device label, good enough for a Persian session list. */
function deviceLabel(ua: string | null): { label: string; icon: typeof Laptop } {
  if (!ua) return { label: 'دستگاه ناشناس', icon: MonitorSmartphone };
  const s = ua.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(s)) {
    return { label: /iphone|ipad/.test(s) ? 'آیفون/iPad' : 'موبایل', icon: Smartphone };
  }
  if (/windows/.test(s)) return { label: 'ویندوز', icon: Laptop };
  if (/mac os|macintosh/.test(s)) return { label: 'مک', icon: Laptop };
  if (/linux/.test(s)) return { label: 'لینوکس', icon: Laptop };
  return { label: 'مرورگر', icon: Laptop };
}

function browserLabel(ua: string | null): string {
  if (!ua) return '—';
  const s = ua.toLowerCase();
  if (/edg\//.test(s)) return 'Edge';
  if (/chrome\//.test(s)) return 'Chrome';
  if (/firefox\//.test(s)) return 'Firefox';
  if (/safari\//.test(s)) return 'Safari';
  return 'مرورگر';
}

function faDateTime(value: string) {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * «نشست‌های من» — every device signed into the account, with the ability to
 * end one session or all the others at once. The list is server-backed, so a
 * revoked device loses access immediately (its JWT stays valid but the session
 * check fails).
 */
export function SessionsPanel() {
  const clear = useAuth((state) => state.clear);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<SessionsResponse>(`/sessions?page=${page}`);
      setSessions(result.items);
      setMeta(result.meta);
    } catch {
      /* api layer surfaces the error */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revokeOne(id: string) {
    setBusy(true);
    try {
      await api.delete(`/sessions/${id}`);
      toast.success('از آن نشست خارج شدید.');
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    setBusy(true);
    try {
      const result = await api.delete<{ revoked: number }>('/sessions');
      toast.success(`از ${result.revoked} نشست دیگر خارج شدید.`);
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusy(false);
    }
  }

  async function logoutEverywhere() {
    setBusy(true);
    try {
      await api.delete('/sessions');
      await api.post('/auth/logout').catch(() => undefined);
      clear();
      toast.success('از همه‌ی دستگاه‌ها خارج شدید.');
      window.location.href = '/login';
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <ShieldCheck className="size-4 text-brand" aria-hidden />
          نشست‌های فعال
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={revokeAll}
            disabled={busy}
            className="indeed-btn indeed-btn-secondary text-xs"
          >
            خروج از سایر دستگاه‌ها
          </button>
          <button
            type="button"
            onClick={logoutEverywhere}
            disabled={busy}
            className="indeed-btn indeed-btn-secondary text-xs"
          >
            <LogOut className="size-3.5" aria-hidden />
            خروج از همه
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        هر دستگاه وارد‌شده یک نشست است. با «خروج از سایر دستگاه‌ها» همه بسته می‌شوند به‌جز
        همین دستگاه. نشستی که تا ۷ روز استفاده نشود به‌صورت خودکار بسته می‌شود.
      </p>

      {loading ? (
        <p className="mt-4 text-xs text-muted">در حال بارگذاری...</p>
      ) : sessions.length === 0 ? (
        <p className="mt-4 text-xs text-muted">نشست فعالی وجود ندارد.</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--vintage-border)] bg-white">
            <table className="w-full min-w-[44rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-dashed border-[var(--vintage-border)] text-right text-muted">
                  <th className="px-3 py-2 font-bold">دستگاه</th>
                  <th className="px-3 py-2 font-bold">مرورگر</th>
                  <th className="px-3 py-2 font-bold">آخرین فعالیت</th>
                  <th className="px-3 py-2 font-bold">IP</th>
                  <th className="px-3 py-2 font-bold">وضعیت</th>
                  <th className="px-3 py-2 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const device = deviceLabel(session.userAgent);
                  const Icon = device.icon;
                  return (
                    <tr
                      key={session.id}
                      className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0"
                    >
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2 font-bold text-ink">
                          <Icon className="size-4 text-brand" aria-hidden />
                          {device.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {browserLabel(session.userAgent)}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {faDateTime(session.lastUsedAt)}
                      </td>
                      <td className="px-3 py-2 text-muted" dir="ltr">
                        {session.ip ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {session.active ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            فعال
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-muted">
                            پایان‌یافته
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {session.active ? (
                          <button
                            type="button"
                            onClick={() => revokeOne(session.id)}
                            disabled={busy}
                            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                          >
                            خروج
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta ? <Pagination meta={meta} onPage={setPage} /> : null}
        </>
      )}
    </div>
  );
}
