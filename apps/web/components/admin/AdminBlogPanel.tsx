'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
  Video,
  X,
} from 'lucide-react';

import {
  api,
  type BlogCategory,
  type BlogListResponse,
  type BlogPost,
} from '@/lib/api';
import { aparatWatchUrl } from '@/lib/blog';
import { cn } from '@/lib/utils';

type Tab = 'posts' | 'categories';

const EMPTY_DRAFT = {
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  categoryId: '',
  tags: '',
  videoUrl: '',
  isFeatured: false,
  isPublished: false,
};

type Draft = typeof EMPTY_DRAFT;

/**
 * Admin «بلاگ» panel: create/edit articles, attach a direct Aparat video by
 * pasting its link, publish/unpublish, delete, and manage categories.
 */
export function AdminBlogPanel() {
  const [tab, setTab] = useState<Tab>('posts');
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['posts', 'مطالب'],
            ['categories', 'دسته‌بندی‌ها'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts' ? <PostsPanel /> : <CategoriesPanel />}
    </div>
  );
}

function PostsPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, cats] = await Promise.all([
        api.get<BlogListResponse>('/admin/blog?limit=50'),
        api.get<BlogCategory[]>('/admin/blog/categories'),
      ]);
      setPosts(list.items);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری مطالب');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setDraft({ ...EMPTY_DRAFT });
    setMessage(null);
    setError(null);
  }

  function openEdit(post: BlogPost) {
    setDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      coverImageUrl: post.coverImageUrl ?? '',
      categoryId: post.categoryId ?? '',
      tags: post.tags.join('، '),
      videoUrl: post.videoUrl ?? post.videoId ?? '',
      isFeatured: post.isFeatured,
      isPublished: post.isPublished,
    });
    setMessage(null);
    setError(null);
  }

  async function save() {
    if (!draft) return;
    if (draft.title.trim().length < 4) {
      setError('عنوان باید حداقل ۴ حرف باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const payload = {
      title: draft.title.trim(),
      slug: draft.slug.trim() || undefined,
      excerpt: draft.excerpt.trim() || undefined,
      content: draft.content.trim() || undefined,
      coverImageUrl: draft.coverImageUrl.trim() || undefined,
      categoryId: draft.categoryId || undefined,
      tags: draft.tags
        .split(/[،,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      videoUrl: draft.videoUrl.trim() || undefined,
      isFeatured: draft.isFeatured,
      isPublished: draft.isPublished,
    };
    try {
      if (draft.id) {
        await api.patch(`/admin/blog/${draft.id}`, payload);
        setMessage('مطلب بلاگ ذخیره شد.');
      } else {
        await api.post('/admin/blog', payload);
        setMessage('مطلب بلاگ ثبت شد.');
      }
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره مطلب ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    try {
      await api.patch(`/admin/blog/${post.id}/publish`, {
        isPublished: !post.isPublished,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    }
  }

  async function remove(post: BlogPost) {
    if (!window.confirm(`مطلب «${post.title}» حذف شود؟`)) return;
    try {
      await api.delete(`/admin/blog/${post.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
      ) : null}

      {draft ? (
        <section className="indeed-panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <BookOpen className="size-4 text-brand" aria-hidden />
              {draft.id ? 'ویرایش مطلب بلاگ' : 'مطلب بلاگ جدید'}
            </h3>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border border-[var(--vintage-border)] p-1.5 text-muted"
              aria-label="بستن"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              عنوان
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              نامک (اختیاری — از عنوان ساخته می‌شود)
              <input
                dir="ltr"
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              خلاصه
              <textarea
                rows={2}
                value={draft.excerpt}
                onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
                className="resize-none rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              متن مطلب (می‌تواند HTML سبک داشته باشد)
              <textarea
                rows={8}
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm leading-7 text-ink outline-none focus:border-brand"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                آدرس تصویر کاور
                <input
                  dir="ltr"
                  value={draft.coverImageUrl}
                  onChange={(event) =>
                    setDraft({ ...draft, coverImageUrl: event.target.value })
                  }
                  className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                دسته‌بندی
                <select
                  value={draft.categoryId}
                  onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                  className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                >
                  <option value="">بدون دسته</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              برچسب‌ها (با «،» جدا کنید)
              <input
                value={draft.tags}
                onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>

            <div className="rounded-xl border border-dashed border-[var(--vintage-border)] p-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                <span className="flex items-center gap-1.5">
                  <Video className="size-4 text-brand" aria-hidden />
                  ویدیوی آپارات (لینک یا هش)
                </span>
                <input
                  dir="ltr"
                  placeholder="https://www.aparat.com/v/xxxxxxxx"
                  value={draft.videoUrl}
                  onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })}
                  className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </label>
              <p className="mt-1.5 text-[11px] text-muted">
                لینک صفحه‌ی ویدیو در آپارات را بچسبانید؛ پخش‌کننده مستقیماً و بدون تبلیغ
                در صفحه‌ی مطلب جای می‌گیرد.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2 font-bold text-ink">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(event) =>
                    setDraft({ ...draft, isPublished: event.target.checked })
                  }
                />
                انتشار فوری
              </label>
              <label className="flex items-center gap-2 font-bold text-ink">
                <input
                  type="checkbox"
                  checked={draft.isFeatured}
                  onChange={(event) =>
                    setDraft({ ...draft, isFeatured: event.target.checked })
                  }
                />
                مطلب شاخص
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره مطلب
          </button>
        </section>
      ) : (
        <button
          type="button"
          onClick={openNew}
          className="indeed-btn indeed-btn-primary w-fit py-2 text-sm"
        >
          <Plus className="size-4" aria-hidden />
          مطلب بلاگ جدید
        </button>
      )}

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری...</p>
      ) : posts.length === 0 ? (
        <p className="indeed-panel p-6 text-center text-sm text-muted">
          هنوز مطلب بلاگی ثبت نشده است.
        </p>
      ) : (
        <div className="indeed-panel overflow-hidden">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-wrap items-center gap-3 border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  {post.title}
                  {post.isFeatured ? (
                    <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                      شاخص
                    </span>
                  ) : null}
                  {post.videoId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Video className="size-3" aria-hidden />
                      ویدیو
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {post.isPublished ? 'منتشرشده' : 'پیش‌نویس'} ·{' '}
                  {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('fa-IR')} ·{' '}
                  {post.viewCount.toLocaleString('fa-IR')} بازدید
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {post.videoId ? (
                  <a
                    href={aparatWatchUrl(post.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="indeed-btn py-1.5 text-xs text-muted"
                  >
                    آپارات
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void togglePublish(post)}
                  className={cn(
                    'indeed-btn py-1.5 text-xs',
                    post.isPublished ? 'text-amber-600' : 'text-emerald-600',
                  )}
                >
                  {post.isPublished ? (
                    <>
                      <EyeOff className="size-3.5" aria-hidden />
                      برداشتن
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" aria-hidden />
                      انتشار
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(post)}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => void remove(post)}
                  className="indeed-btn py-1.5 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesPanel() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await api.get<BlogCategory[]>('/admin/blog/categories'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/blog/categories', { name: name.trim() });
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'افزودن ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(category: BlogCategory) {
    try {
      await api.patch(`/admin/blog/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    }
  }

  async function remove(category: BlogCategory) {
    if (!window.confirm(`دسته «${category.name}» حذف شود؟`)) return;
    try {
      await api.delete(`/admin/blog/categories/${category.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <form onSubmit={add} className="indeed-panel flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          نام دسته‌بندی
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden />
          افزودن
        </button>
      </form>

      <div className="indeed-panel overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">دسته‌بندی‌ای وجود ندارد.</p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--vintage-border)] px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-bold text-ink">{category.name}</p>
                <p className="text-[11px] text-muted">
                  {category.isActive ? 'فعال' : 'غیرفعال'}
                  {category._count ? ` · ${category._count.posts} مطلب` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggle(category)}
                  className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                >
                  <Eye className="size-3.5" aria-hidden />
                  {category.isActive ? 'غیرفعال' : 'فعال'}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(category)}
                  className="indeed-btn py-1.5 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
