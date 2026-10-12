'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileText, Newspaper, Plus, XCircle } from 'lucide-react';

import {
  api,
  type NewsCategory,
  type NewsItem,
  type NewsListResponse,
  type ReporterSummary,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

const STATUS_LABEL: Record<NewsItem['status'], string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'منتشرشده',
  REJECTED: 'ردشده',
};

const STATUS_BADGE: Record<NewsItem['status'], string> = {
  PENDING: 'badge-progress',
  APPROVED: 'badge-open',
  REJECTED: 'badge-closed',
};

interface Draft {
  id?: string;
  title: string;
  summary: string;
  body: string;
  categoryId: string;
}

const EMPTY_DRAFT: Draft = {
  title: '',
  summary: '',
  body: '',
  categoryId: '',
};

/**
 * «شهروند خبرنگار» panel: request access, then write / edit own news. Any edit
 * sends an item back to PENDING (the API enforces that), so the badge flips
 * back to «در انتظار تأیید».
 */
export function ReporterPanel() {
  const { user, hydrated } = useAuth();
  // The stored role can be stale right after an admin approves the request, so
  // confirm it against the server before gating the panel.
  const [liveRole, setLiveRole] = useState<string | null>(null);
  const isReporter =
    (liveRole ?? user?.role) === 'CITIZEN_REPORTER' ||
    (liveRole ?? user?.role) === 'ADMIN';

  useEffect(() => {
    if (!hydrated) return;
    api
      .get<{ role: string }>('/auth/me')
      .then((me) => setLiveRole(me.role))
      .catch(() => {
        /* fall back to the stored role */
      });
  }, [hydrated]);

  const [summary, setSummary] = useState<ReporterSummary | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const req = await api
        .get<{ status: string } | null>('/news/reporter/request/mine')
        .catch(() => null);
      setRequestStatus(req?.status ?? null);

      if (isReporter) {
        const [sum, list, cats] = await Promise.all([
          api.get<ReporterSummary>('/news/reporter/mine/summary'),
          api.get<NewsListResponse>('/news/reporter/mine?limit=50'),
          api.get<NewsCategory[]>('/news/public/categories').catch(() => []),
        ]);
        setSummary(sum);
        setItems(list.items);
        setCategories(cats);
      }
    } finally {
      setLoading(false);
    }
  }, [isReporter]);

  useEffect(() => {
    if (hydrated) void loadAll();
  }, [hydrated, loadAll]);

  async function requestAccess() {
    try {
      await api.post('/news/reporter/request', {});
      toast.success('درخواست شما ثبت شد و در انتظار بررسی مدیر است.');
      await loadAll();
    } catch {
      /* api layer already surfaces the error */
    }
  }

  async function save() {
    if (!draft) return;
    if (draft.title.trim().length < 4) {
      toast.error('عنوان خبر باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        summary: draft.summary.trim() || undefined,
        body: draft.body.trim() || undefined,
        categoryId: draft.categoryId || undefined,
      };
      if (draft.id) {
        await api.patch(`/news/reporter/mine/${draft.id}`, payload);
      } else {
        await api.post('/news/reporter/mine', payload);
      }
      toast.success('خبر ذخیره شد و برای بررسی ارسال گردید.');
      setDraft(null);
      await loadAll();
    } catch {
      /* handled globally */
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || loading) {
    return <div className="indeed-panel p-8 text-center text-sm text-muted">در حال بارگذاری...</div>;
  }

  if (!isReporter) {
    return (
      <div className="indeed-panel p-8 text-center">
        <span className="vintage-avatar mx-auto flex size-14 items-center justify-center">
          <Newspaper className="size-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-ink">شهروند خبرنگار شوید</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted">
          برای ثبت خبر در «نبض شهر»، ابتدا درخواست خود را ارسال کنید. پس از تأیید مدیر،
          امکان ثبت و ویرایش خبر برای شما فعال می‌شود.
        </p>

        {requestStatus === 'PENDING' ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
            <Clock className="size-4" aria-hidden />
            درخواست شما در انتظار بررسی مدیر است.
          </p>
        ) : (
          <div className="mt-6">
            {requestStatus === 'REJECTED' ? (
              <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-red-700">
                <XCircle className="size-4" aria-hidden />
                درخواست قبلی شما رد شد. می‌توانید دوباره درخواست دهید.
              </p>
            ) : null}
            <button onClick={requestAccess} className="indeed-btn indeed-btn-primary">
              درخواست شهروند خبرنگار
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">خبرهای من</h2>
          <p className="text-sm text-muted">ثبت و ویرایش خبرهای شما برای «نبض شهر»</p>
        </div>
        <button onClick={() => setDraft({ ...EMPTY_DRAFT })} className="indeed-btn indeed-btn-primary">
          <Plus className="size-4" aria-hidden />
          خبر جدید
        </button>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={FileText} label="کل خبرها" value={summary.total} />
          <StatCard icon={Clock} label="در انتظار تأیید" value={summary.pending} />
          <StatCard icon={CheckCircle2} label="منتشرشده" value={summary.approved} />
          <StatCard icon={XCircle} label="ردشده" value={summary.rejected} />
        </div>
      ) : null}

      {draft ? (
        <div className="indeed-panel p-5">
          <h3 className="text-sm font-extrabold text-ink">
            {draft.id ? 'ویرایش خبر' : 'ثبت خبر جدید'}
          </h3>
          <div className="mt-4 grid gap-4">
            <Field label="عنوان خبر">
              <input
                className="indeed-input"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="نام منتشرکننده">
                <input
                  className="indeed-input cursor-not-allowed bg-soft text-muted"
                  value={user?.fullName ?? user?.email ?? ''}
                  readOnly
                  disabled
                />
                <p className="mt-1 text-[11px] text-muted">
                  نام منتشرکننده همان نام کاربری شماست و قابل تغییر نیست.
                </p>
              </Field>
              <Field label="دسته‌بندی">
                <select
                  className="indeed-input"
                  value={draft.categoryId}
                  onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                >
                  <option value="">بدون دسته‌بندی</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="خلاصه (یک‌خطی)">
              <input
                className="indeed-input"
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
              />
            </Field>
            <Field label="متن کامل خبر">
              <textarea
                className="indeed-input min-h-40"
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={save} disabled={saving} className="indeed-btn indeed-btn-primary">
              {saving ? 'در حال ذخیره...' : 'ذخیره و ارسال برای بررسی'}
            </button>
            <button onClick={() => setDraft(null)} className="indeed-btn indeed-btn-secondary">
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      <div className="indeed-panel overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">هنوز خبری ثبت نکرده‌اید.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-48 flex-1">
                <p className="font-bold text-ink">{item.title}</p>
                {item.status === 'REJECTED' && item.reason ? (
                  <p className="mt-1 text-xs text-red-600">دلیل رد: {item.reason}</p>
                ) : null}
              </div>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[item.status]}`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              <button
                onClick={() =>
                  setDraft({
                    id: item.id,
                    title: item.title,
                    summary: item.summary ?? '',
                    body: item.body ?? '',
                    categoryId: item.category?.id ?? '',
                  })
                }
                className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
              >
                ویرایش
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <div className="indeed-panel p-4">
      <Icon className="size-5 text-brand" aria-hidden />
      <p className="mt-2 text-2xl font-extrabold text-ink">{value.toLocaleString('fa-IR')}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      {children}
    </label>
  );
}
