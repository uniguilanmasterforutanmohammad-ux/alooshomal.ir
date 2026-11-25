'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import {
  api,
  type AccommodationProperty,
  type AccommodationTask,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { todayIso } from '@/lib/jalali';
import { toast } from '@/lib/toast';

const KIND_LABELS: Record<string, string> = {
  CLEANING: 'نظافت',
  MAINTENANCE: 'تعمیر و نگهداری',
  OTHER: 'سایر',
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'باز',
  DONE: 'انجام‌شده',
  CANCELLED: 'لغوشده',
};
const FILTERS = ['OPEN', 'DONE', ''] as const;

export default function AccommodationTasksPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [tasks, setTasks] = useState<AccommodationTask[]>([]);
  const [properties, setProperties] = useState<AccommodationProperty[]>([]);
  const [filter, setFilter] = useState<'OPEN' | 'DONE' | ''>('OPEN');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    kind: 'CLEANING',
    propertyId: '',
    dueDate: '',
    assignee: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter ? `?status=${filter}` : '';
      const [taskList, propertyList] = await Promise.all([
        api.get<AccommodationTask[]>(`/accommodations/tasks${query}`),
        api.get<AccommodationProperty[]>('/accommodations'),
      ]);
      setTasks(taskList);
      setProperties(propertyList);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/accommodations/tasks');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function createTask() {
    if (form.title.trim().length < 2) {
      toast.error('عنوان وظیفه را وارد کنید.');
      return;
    }
    await api.post('/accommodations/tasks', {
      title: form.title.trim(),
      kind: form.kind,
      propertyId: form.propertyId || undefined,
      dueDate: form.dueDate || undefined,
      assignee: form.assignee.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    setForm({
      title: '',
      kind: 'CLEANING',
      propertyId: '',
      dueDate: '',
      assignee: '',
      notes: '',
    });
    setShowForm(false);
    toast.success('وظیفه اضافه شد');
    await load();
  }

  async function setStatus(task: AccommodationTask, status: string) {
    await api.patch(`/accommodations/tasks/${task.id}`, { status });
    toast.success('وضعیت وظیفه به‌روزرسانی شد');
    await load();
  }

  async function remove(task: AccommodationTask) {
    if (!window.confirm('این وظیفه حذف شود؟')) return;
    await api.delete(`/accommodations/tasks/${task.id}`);
    toast.success('وظیفه حذف شد');
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/dashboard/business/accommodations"
            className="text-xs font-bold text-brand"
          >
            ← بازگشت به اقامتگاه‌ها
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">ابزار عملیات میزبان</h1>
          <p className="mt-1 text-sm text-muted">
            نظافت بین اقامت‌ها، تعمیرات و کارهای اجرایی هر اقامتگاه را پیگیری کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="indeed-btn indeed-btn-primary"
        >
          <Plus className="size-4" aria-hidden />
          {showForm ? 'بستن فرم' : 'وظیفه‌ی جدید'}
        </button>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      {showForm ? (
        <section className="indeed-panel p-5">
          <h2 className="mb-4 text-lg font-extrabold text-ink">افزودن وظیفه</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="عنوان وظیفه (مثلاً نظافت پس از خروج)"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm lg:col-span-2"
            />
            <select
              value={form.kind}
              onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
            >
              <option value="CLEANING">نظافت</option>
              <option value="MAINTENANCE">تعمیر و نگهداری</option>
              <option value="OTHER">سایر</option>
            </select>
            <select
              value={form.propertyId}
              onChange={(event) => setForm((prev) => ({ ...prev, propertyId: event.target.value }))}
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
            >
              <option value="">بدون اقامتگاه مشخص</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
            <JalaliDatePicker
              value={form.dueDate}
              onChange={(iso) => setForm((prev) => ({ ...prev, dueDate: iso }))}
              min={todayIso()}
              aria-label="موعد انجام"
            />
            <input
              value={form.assignee}
              onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
              placeholder="مسئول انجام (اختیاری)"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
            />
            <input
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="توضیحات (اختیاری)"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm lg:col-span-2"
            />
            <button
              type="button"
              onClick={() => void createTask()}
              className="indeed-btn indeed-btn-primary"
            >
              افزودن
            </button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item || 'all'}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
              filter === item ? 'border-brand bg-brand-light text-brand' : 'text-muted'
            }`}
          >
            {item ? STATUS_LABELS[item] : 'همه'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری…</p>
      ) : tasks.length === 0 ? (
        <div className="indeed-panel p-10 text-center text-sm text-muted">
          وظیفه‌ای با این فیلتر وجود ندارد.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <article key={task.id} className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  {task.title}
                  <span className="rounded-full bg-[var(--vintage-paper)] px-2 py-0.5 text-[10px] font-bold text-muted">
                    {KIND_LABELS[task.kind] ?? task.kind}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      task.status === 'DONE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'CANCELLED'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {STATUS_LABELS[task.status] ?? task.status}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {task.property?.title ?? 'بدون اقامتگاه'}
                  {task.dueDate
                    ? ` • موعد: ${new Date(task.dueDate).toLocaleDateString('fa-IR')}`
                    : ''}
                  {task.assignee ? ` • مسئول: ${task.assignee}` : ''}
                  {task.booking ? ` • رزرو ${task.booking.guestName}` : ''}
                </p>
                {task.notes ? (
                  <p className="mt-1 text-xs text-muted">{task.notes}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {task.status !== 'DONE' ? (
                  <button
                    type="button"
                    onClick={() => void setStatus(task, 'DONE')}
                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:border-emerald-500"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    انجام شد
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setStatus(task, 'OPEN')}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-bold text-muted hover:border-brand hover:text-brand"
                  >
                    بازگشایی
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(task)}
                  className="rounded-lg border px-2 py-1.5 text-red-600 hover:border-red-400"
                  aria-label="حذف وظیفه"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
