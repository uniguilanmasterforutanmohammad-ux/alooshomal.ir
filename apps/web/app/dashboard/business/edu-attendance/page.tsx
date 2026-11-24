'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import {
  api,
  type EduAttendance,
  type EduClass,
  type EduEnrollment,
  type EduSession,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const SESSION_STATUS: Record<string, string> = {
  SCHEDULED: 'زمان‌بندی‌شده',
  DONE: 'برگزارشده',
  CANCELLED_BY_COACH: 'لغو از طرف مربی',
  CANCELLED_BY_STUDENT: 'لغو از طرف هنرجو',
};

const ATT_STATUS: Record<string, string> = {
  PRESENT: 'حاضر',
  ABSENT_EXCUSED: 'غیبت موجه',
  ABSENT: 'غیبت',
  MAKEUP: 'جبرانی',
};

type AttendanceRow = EduEnrollment & { attendances: EduAttendance[] };

const dateLabel = (value: string) =>
  new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

export default function EduAttendancePage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [classId, setClassId] = useState('');
  const [sessions, setSessions] = useState<EduSession[]>([]);
  const [selected, setSelected] = useState<EduSession | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [form, setForm] = useState({ scheduledAt: '', topic: '' });

  const loadSessions = useCallback(async (id: string) => {
    if (!id) return;
    setSessions(await api.get<EduSession[]>(`/edu-sessions?classId=${id}`));
  }, []);

  const loadAttendance = useCallback(async (sessionId: string) => {
    const data = await api.get<{ session: EduSession; enrollments: AttendanceRow[] }>(
      `/edu-sessions/${sessionId}/attendance`,
    );
    setSelected(data.session);
    setRows(data.enrollments);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/edu-attendance');
      return;
    }
    if (!enabled) return;
    api.get<EduClass[]>('/edu-classes?status=ACTIVE').then((list) => {
      setClasses(list);
      if (list[0]) {
        setClassId(list[0].id);
        void loadSessions(list[0].id);
      }
    });
  }, [hydrated, token, router, enabled, loadSessions]);

  async function createSession(event: React.FormEvent) {
    event.preventDefault();
    if (!classId || !form.scheduledAt) return;
    await api.post('/edu-sessions', {
      classId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      topic: form.topic.trim() || undefined,
    });
    setForm({ scheduledAt: '', topic: '' });
    await loadSessions(classId);
    toast.success('جلسه ثبت شد');
  }

  async function setSessionStatus(session: EduSession, status: string) {
    await api.patch(`/edu-sessions/${session.id}`, { status });
    await loadSessions(classId);
    if (selected?.id === session.id) void loadAttendance(session.id);
  }

  async function record(enrollmentId: string, status: string) {
    if (!selected) return;
    await api.post(`/edu-sessions/${selected.id}/attendance`, { enrollmentId, status });
    await loadAttendance(selected.id);
    toast.success('حضور ثبت شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">تقویم، حضور و جبرانی</h1>
        <p className="mt-1 text-sm text-muted">
          زمان‌بندی جلسات، ثبت حضور/غیبت و کسر اعتبار بسته به‌صورت خودکار.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <select
        className={field}
        value={classId}
        onChange={(e) => {
          setClassId(e.target.value);
          setSelected(null);
          setRows([]);
          void loadSessions(e.target.value);
        }}
      >
        <option value="">انتخاب کلاس…</option>
        {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.title}</option>)}
      </select>

      <form onSubmit={createSession} className="indeed-panel grid gap-2 p-4 md:grid-cols-3">
        <input className={field} type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} required />
        <input className={field} placeholder="موضوع جلسه" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> افزودن جلسه</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <article key={session.id} className={cn('indeed-panel flex flex-wrap items-center justify-between gap-2 p-3', selected?.id === session.id && 'ring-2 ring-brand')}>
              <button type="button" className="text-right" onClick={() => void loadAttendance(session.id)}>
                <h3 className="text-sm font-extrabold text-ink">{session.topic ?? 'جلسه'}</h3>
                <p className="text-[11px] text-muted">{dateLabel(session.scheduledAt)} • {SESSION_STATUS[session.status] ?? session.status}</p>
              </button>
              <select className={field} value={session.status} onChange={(e) => void setSessionStatus(session, e.target.value)}>
                {Object.entries(SESSION_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </article>
          ))}
          {sessions.length === 0 ? <div className="indeed-panel p-6 text-center text-sm text-muted">جلسه‌ای ثبت نشده است.</div> : null}
        </div>

        <div className="indeed-panel p-4">
          <h2 className="text-sm font-extrabold text-ink">حضور و غیاب</h2>
          {!selected ? (
            <p className="mt-2 text-xs text-muted">یک جلسه را انتخاب کنید.</p>
          ) : rows.length === 0 ? (
            <p className="mt-2 text-xs text-muted">هنرجوی فعالی در این کلاس نیست.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {rows.map((row) => {
                const current = row.attendances[0];
                return (
                  <li key={row.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>{row.student?.fullName}</span>
                    <select
                      className={field}
                      value={current?.status ?? ''}
                      onChange={(e) => void record(row.id, e.target.value)}
                    >
                      <option value="" disabled>ثبت وضعیت…</option>
                      {Object.entries(ATT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
