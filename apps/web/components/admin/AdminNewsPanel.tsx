'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';

import {
  api,
  type NewsCategory,
  type NewsItem,
  type NewsListResponse,
  type NewsStatus,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminNewsEditor } from './AdminNewsEditor';

interface ReporterRequest {
  id: string;
  message: string | null;
  status: NewsStatus;
  reason: string | null;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null; role: string };
}

const STATUS_LABEL: Record<NewsStatus, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'منتشرشده',
  REJECTED: 'ردشده',
};
const STATUS_BADGE: Record<NewsStatus, string> = {
  PENDING: 'badge-progress',
  APPROVED: 'badge-open',
  REJECTED: 'badge-closed',
};

type Tab = 'news' | 'requests' | 'categories';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'news', label: 'خبرهای سایت' },
  { key: 'requests', label: 'درخواست‌های شهروند خبرنگار' },
  { key: 'categories', label: 'دسته‌بندی‌ها' },
];

export function AdminNewsPanel() {
  const [tab, setTab] = useState<Tab>('news');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === item.key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'news' ? <NewsModeration /> : null}
      {tab === 'requests' ? <ReporterRequests /> : null}
      {tab === 'categories' ? <NewsCategories /> : null}
    </div>
  );
}

function NewsModeration() {
  const [status, setStatus] = useState<NewsStatus | ''>('PENDING');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : '';
      const data = await api.get<NewsListResponse>(`/admin/news${qs}`);
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: NewsStatus) {
    let reason: string | undefined;
    if (decision === 'REJECTED') {
      const input = window.prompt('دلیل رد خبر را وارد کنید:');
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    await api.patch(`/admin/news/${id}/moderate`, { decision, reason });
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm('حذف کامل این خبر؟')) return;
    await api.delete(`/admin/news/${id}`);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', ''] as const).map((value) => (
          <button
            key={value || 'all'}
            onClick={() => setStatus(value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-bold transition',
              status === value
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted',
            )}
          >
            {value ? STATUS_LABEL[value as NewsStatus] : 'همه'}
          </button>
        ))}
      </div>

      <div className="indeed-panel overflow-hidden">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">خبری در این وضعیت وجود ندارد.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-56 flex-1">
                <p className="font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.author?.fullName ?? item.author?.email ?? 'نامشخص'}
                  {item.category?.name ? ` • ${item.category.name}` : ''}
                </p>
              </div>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[item.status]}`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingId(item.id)}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  ویرایش
                </button>
                {item.status === 'APPROVED' ? (
                  <a
                    href={`/pulse/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    مشاهده
                  </a>
                ) : null}
                {item.status !== 'APPROVED' ? (
                  <button
                    onClick={() => decide(item.id, 'APPROVED')}
                    className="indeed-btn indeed-btn-primary py-1.5 text-xs"
                  >
                    <Check className="size-3.5" aria-hidden />
                    تأیید
                  </button>
                ) : null}
                {item.status !== 'REJECTED' ? (
                  <button
                    onClick={() => decide(item.id, 'REJECTED')}
                    className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                  >
                    <X className="size-3.5" aria-hidden />
                    رد
                  </button>
                ) : null}
                <button
                  onClick={() => remove(item.id)}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingId ? (
        <AdminNewsEditor
          newsId={editingId}
          onClose={() => setEditingId(null)}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}

function ReporterRequests() {
  const [items, setItems] = useState<ReporterRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ReporterRequest[]>('/admin/news/reporter-requests');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: NewsStatus) {
    let reason: string | undefined;
    if (decision === 'REJECTED') {
      const input = window.prompt('دلیل رد درخواست را وارد کنید:');
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    await api.patch(`/admin/news/reporter-requests/${id}`, { decision, reason });
    await load();
  }

  return (
    <div className="indeed-panel overflow-hidden">
      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-muted">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">درخواستی ثبت نشده است.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
          >
            <div className="min-w-56 flex-1">
              <p className="font-bold text-ink">
                {item.user.fullName ?? item.user.email}
              </p>
              <p className="mt-1 text-xs text-muted">{item.user.email}</p>
              {item.message ? (
                <p className="mt-1 text-xs text-muted">{item.message}</p>
              ) : null}
            </div>
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[item.status]}`}
            >
              {STATUS_LABEL[item.status]}
            </span>
            {item.status === 'PENDING' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide(item.id, 'APPROVED')}
                  className="indeed-btn indeed-btn-primary py-1.5 text-xs"
                >
                  <Check className="size-3.5" aria-hidden />
                  تأیید
                </button>
                <button
                  onClick={() => decide(item.id, 'REJECTED')}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                >
                  <X className="size-3.5" aria-hidden />
                  رد
                </button>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function NewsCategories() {
  const [items, setItems] = useState<NewsCategory[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<NewsCategory[]>('/admin/news/categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!name.trim()) return;
    await api.post('/admin/news/categories', { name: name.trim() });
    setName('');
    await load();
  }

  async function toggle(category: NewsCategory) {
    await api.patch(`/admin/news/categories/${category.id}`, {
      isActive: !category.isActive,
    });
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm('حذف این دسته‌بندی؟')) return;
    await api.delete(`/admin/news/categories/${id}`);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <input
          className="indeed-input"
          placeholder="نام دسته‌بندی جدید"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add()}
        />
        <button onClick={add} className="indeed-btn indeed-btn-primary shrink-0">
          افزودن
        </button>
      </div>

      <div className="indeed-panel overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">دسته‌بندی‌ای ثبت نشده است.</p>
        ) : (
          items.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
            >
              <span className="font-bold text-ink">{category.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(category)}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                >
                  {category.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                </button>
                <button
                  onClick={() => remove(category.id)}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
