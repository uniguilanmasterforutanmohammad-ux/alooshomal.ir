'use client';

import { useEffect, useState } from 'react';
import { Save, Trash2, X } from 'lucide-react';

import { api, type NewsCategory, type NewsItem, type NewsStatus } from '@/lib/api';
import { toast } from '@/lib/toast';

interface Props {
  newsId: string;
  onClose: () => void;
  onChanged: () => void;
  /** Base item route (defaults to the super-admin `/admin/news/:id`). */
  itemPath?: (id: string) => string;
  /** Base list route for decide/delete, and the categories endpoint. */
  categoriesPath?: string;
  /** Hide the delete button for limited moderators. */
  allowDelete?: boolean;
}

const STATUS_OPTIONS: Array<{ value: NewsStatus; label: string }> = [
  { value: 'PENDING', label: 'در انتظار تأیید' },
  { value: 'APPROVED', label: 'منتشرشده' },
  { value: 'REJECTED', label: 'ردشده' },
];

/**
 * Admin news editor: loads any item (even unrelated to its status), lets the
 * admin fix text/category/status without bouncing it back to review, or delete
 * it outright. This backs the «ویرایش» button on the moderation table so an
 * admin never hits the public 404 for a non-approved item.
 */
export function AdminNewsEditor({
  newsId,
  onClose,
  onChanged,
  itemPath = (id) => `/admin/news/${id}`,
  categoriesPath = '/admin/news/categories',
  allowDelete = true,
}: Props) {
  const [item, setItem] = useState<NewsItem | null>(null);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [draft, setDraft] = useState({
    title: '',
    summary: '',
    body: '',
    categoryId: '',
    status: 'PENDING' as NewsStatus,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<NewsItem>(itemPath(newsId)),
      api.get<NewsCategory[]>(categoriesPath).catch(() => []),
    ])
      .then(([news, cats]) => {
        setItem(news);
        setCategories(cats);
        setDraft({
          title: news.title,
          summary: news.summary ?? '',
          body: news.body ?? '',
          categoryId: news.category?.id ?? '',
          status: news.status,
        });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'خطا در بارگذاری خبر'))
      .finally(() => setLoading(false));
  }, [newsId, itemPath, categoriesPath]);

  async function save() {
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
        status: draft.status,
      };
      await api.patch(itemPath(newsId), payload);
      toast.success('خبر ذخیره شد.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('حذف کامل این خبر؟ این عملیات بازگشت‌پذیر نیست.')) return;
    try {
      await api.delete(itemPath(newsId));
      toast.success('خبر حذف شد.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-ink">ویرایش خبر (مدیر)</h3>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="بستن">
          <X className="size-4" />
        </button>
      </div>

      {loading || !item ? (
        <p className="py-8 text-center text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <div className="mt-4 grid gap-4">
          <label className="text-xs font-bold text-muted">
            عنوان خبر
            <input
              className="indeed-input mt-1"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-muted">
              وضعیت
              <select
                className="indeed-input mt-1"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value as NewsStatus })
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-muted">
              دسته‌بندی
              <select
                className="indeed-input mt-1"
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
            </label>
          </div>

          <label className="text-xs font-bold text-muted">
            خلاصه (یک‌خطی)
            <input
              className="indeed-input mt-1"
              value={draft.summary}
              onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
            />
          </label>

          <label className="text-xs font-bold text-muted">
            متن کامل خبر
            <textarea
              className="indeed-input mt-1 min-h-40"
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            />
          </label>

          <p className="text-[11px] text-muted">
            نویسنده/منتشرکننده: {item.author?.fullName ?? item.publisherName ?? '—'}
          </p>

          <div className="flex flex-wrap gap-3">
            <button onClick={save} disabled={saving} className="indeed-btn indeed-btn-primary">
              <Save className="size-4" aria-hidden />
              {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
            {allowDelete ? (
              <button
                onClick={remove}
                className="indeed-btn indeed-btn-secondary text-red-600"
              >
                <Trash2 className="size-4" aria-hidden />
                حذف خبر
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
