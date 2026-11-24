'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type EduClass, type EduEnrollment, type EduStudent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const emptyStudent = { fullName: '', phone: '', guardianName: '', guardianPhone: '', goal: '' };

export default function EduStudentsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [students, setStudents] = useState<EduStudent[]>([]);
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [enrollments, setEnrollments] = useState<EduEnrollment[]>([]);
  const [form, setForm] = useState(emptyStudent);
  const [enrollForm, setEnrollForm] = useState({ studentId: '', classId: '', packageSessions: '' });
  const [progressForm, setProgressForm] = useState({ enrollmentId: '', topic: '', homework: '', feedback: '', mediaUrl: '' });

  const load = useCallback(async () => {
    const [s, c, e] = await Promise.all([
      api.get<EduStudent[]>('/edu-students'),
      api.get<EduClass[]>('/edu-classes?status=ACTIVE'),
      api.get<EduEnrollment[]>('/edu-enrollments'),
    ]);
    setStudents(s);
    setClasses(c);
    setEnrollments(e);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/edu-students');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function createStudent(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim()) return;
    await api.post('/edu-students', {
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || undefined,
      guardianName: form.guardianName.trim() || undefined,
      guardianPhone: form.guardianPhone.trim() || undefined,
      goal: form.goal.trim() || undefined,
    });
    setForm(emptyStudent);
    await load();
    toast.success('هنرجو ثبت شد');
  }

  async function makeStudentLink(student: EduStudent) {
    const result = await api.post<{ token: string }>(`/edu-students/${student.id}/access-token`);
    const url = `${window.location.origin}/student/${result.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('لینک پنل هنرجو/ولی کپی شد');
    } catch {
      toast.info(url);
    }
  }

  async function enroll(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollForm.studentId || !enrollForm.classId) return;
    await api.post('/edu-enrollments', {
      studentId: enrollForm.studentId,
      classId: enrollForm.classId,
      packageSessions: enrollForm.packageSessions ? Number(enrollForm.packageSessions) : undefined,
    });
    setEnrollForm({ studentId: '', classId: '', packageSessions: '' });
    await load();
    toast.success('ثبت‌نام انجام شد');
  }

  async function addProgress(event: React.FormEvent) {
    event.preventDefault();
    if (!progressForm.enrollmentId || !progressForm.topic.trim()) return;
    await api.post('/edu-progress', {
      enrollmentId: progressForm.enrollmentId,
      topic: progressForm.topic.trim(),
      homework: progressForm.homework.trim() || undefined,
      feedback: progressForm.feedback.trim() || undefined,
      mediaUrl: progressForm.mediaUrl.trim() || undefined,
    });
    setProgressForm({ enrollmentId: '', topic: '', homework: '', feedback: '', mediaUrl: '' });
    toast.success('یادداشت پیشرفت ثبت شد');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">هنرجویان و ثبت‌نام</h1>
        <p className="mt-1 text-sm text-muted">
          پرونده‌ی هنرجو/ولی، ثبت‌نام در کلاس با کنترل ظرفیت و ثبت برنامه و پیشرفت.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={createStudent} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <input className={field} placeholder="نام هنرجو" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required />
        <input className={field} placeholder="تلفن" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        <input className={field} placeholder="نام ولی" value={form.guardianName} onChange={(e) => setForm((p) => ({ ...p, guardianName: e.target.value }))} />
        <input className={field} placeholder="تلفن ولی" value={form.guardianPhone} onChange={(e) => setForm((p) => ({ ...p, guardianPhone: e.target.value }))} />
        <input className={`${field} md:col-span-3`} placeholder="هدف آموزشی" value={form.goal} onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت هنرجو</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <form onSubmit={enroll} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">ثبت‌نام در کلاس</h2>
          <select className={field} value={enrollForm.studentId} onChange={(e) => setEnrollForm((p) => ({ ...p, studentId: e.target.value }))} required>
            <option value="">انتخاب هنرجو…</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
          </select>
          <select className={field} value={enrollForm.classId} onChange={(e) => setEnrollForm((p) => ({ ...p, classId: e.target.value }))} required>
            <option value="">انتخاب کلاس…</option>
            {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.title}</option>)}
          </select>
          <input className={field} placeholder="تعداد جلسه‌ی بسته (پیش‌فرض کلاس)" inputMode="numeric" value={enrollForm.packageSessions} onChange={(e) => setEnrollForm((p) => ({ ...p, packageSessions: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت‌نام</button>
        </form>

        <form onSubmit={addProgress} className="indeed-panel grid gap-2 p-4">
          <h2 className="text-sm font-extrabold text-ink">برنامه و پیشرفت</h2>
          <select className={field} value={progressForm.enrollmentId} onChange={(e) => setProgressForm((p) => ({ ...p, enrollmentId: e.target.value }))} required>
            <option value="">انتخاب ثبت‌نام…</option>
            {enrollments.map((row) => <option key={row.id} value={row.id}>{row.student?.fullName} — {row.class?.title}</option>)}
          </select>
          <input className={field} placeholder="موضوع جلسه" value={progressForm.topic} onChange={(e) => setProgressForm((p) => ({ ...p, topic: e.target.value }))} required />
          <input className={field} placeholder="تمرین تا جلسه‌ی بعد" value={progressForm.homework} onChange={(e) => setProgressForm((p) => ({ ...p, homework: e.target.value }))} />
          <input className={field} placeholder="بازخورد برای هنرجو/ولی" value={progressForm.feedback} onChange={(e) => setProgressForm((p) => ({ ...p, feedback: e.target.value }))} />
          <input className={field} placeholder="لینک عکس/ویدئو (اختیاری)" value={progressForm.mediaUrl} onChange={(e) => setProgressForm((p) => ({ ...p, mediaUrl: e.target.value }))} />
          <button type="submit" className="indeed-btn indeed-btn-primary">ثبت یادداشت</button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {students.map((student) => (
          <article key={student.id} className="indeed-panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-ink">{student.fullName}</h3>
                <p className="text-[11px] text-muted">
                  {student.phone ?? '—'}
                  {student.guardianName ? ` • ولی: ${student.guardianName} ${student.guardianPhone ?? ''}` : ''}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', student.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                {student.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            {student.goal ? <p className="mt-1 text-xs text-muted">هدف: {student.goal}</p> : null}
            <div className="mt-1">
              <button type="button" className="indeed-btn indeed-btn-ghost text-xs" onClick={() => void makeStudentLink(student)}>
                لینک پنل هنرجو/ولی
              </button>
            </div>
            {student.enrollments && student.enrollments.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 text-[11px] text-muted">
                {student.enrollments.map((row) => (
                  <li key={row.id}>{row.class?.title} • {row.usedSessions}/{row.packageSessions} جلسه</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {students.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted md:col-span-2">هنرجویی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
