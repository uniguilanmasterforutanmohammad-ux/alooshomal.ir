'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Crown,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import {
  api,
  type FeedMineOverview,
  type FeedPackage,
  type FeedPost,
  type UploadResult,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'منتشرشده',
  REJECTED: 'ردشده',
};

/** One image slot in the composer. Uploads run in the background so the user
 * never waits for the network before submitting the post. */
interface ImageSlot {
  id: string;
  /** object URL shown instantly while the real upload is in flight */
  preview: string;
  url: string | null;
  status: 'uploading' | 'ready' | 'error';
}

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR');
}

/**
 * «فید من» — the user's feed panel. Publishing a post (text + images) is free;
 * the only paid product is *tagging* one of the author's own business cards or
 * biolinks on the post. There is no payment gateway yet, so the tag fee is
 * settled by an admin confirmation (simulated payment). The panel also manages
 * the opt-in feed subscription package and the user's own posts.
 */
export default function DashboardFeedsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [data, setData] = useState<FeedMineOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [body, setBody] = useState('');
  const [topicId, setTopicId] = useState('');
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagKind, setTagKind] = useState<'' | 'BIOLINK' | 'BUSINESS_CARD'>('');
  const [tagTargetId, setTagTargetId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Tracks in-flight background uploads so `submit` can await the ones the user
  // has not finished yet, without blocking the form while they type.
  const pendingUploads = useRef<Map<string, Promise<void>>>(new Map());

  const load = useCallback(async () => {
    try {
      setData(await api.get<FeedMineOverview>('/feeds/mine'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  async function requestPackage(pkg: FeedPackage) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/feeds/mine/subscriptions/request', { packageId: pkg.id });
      setMessage('درخواست اشتراک فید ثبت شد. پس از تأیید مدیر فعال می‌شود.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Kick off image uploads in the *background*: each file gets an optimistic
   * preview slot immediately and the actual upload resolves on its own, so the
   * user can keep writing the post and press «ثبت پست» without waiting.
   */
  function uploadFiles(files: FileList) {
    if (!data) return;
    const maxImages = data.limits.maxImages;
    const maxBytes = data.limits.maxImageKb * 1024;
    setError(null);
    const free = maxImages - images.length;
    if (free <= 0) {
      setError(`حداکثر ${maxImages} تصویر برای هر پست مجاز است`);
      return;
    }
    const chosen = Array.from(files).slice(0, free);
    if (files.length > free) {
      setError(`حداکثر ${maxImages} تصویر برای هر پست مجاز است`);
    }

    for (const file of chosen) {
      if (file.size > maxBytes) {
        setError(`حجم هر تصویر نباید بیشتر از ${data.limits.maxImageKb} کیلوبایت باشد`);
        continue;
      }
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { id, preview, url: null, status: 'uploading' }]);

      const form = new FormData();
      form.append('file', file);
      const task = api
        .upload<UploadResult>('/feeds/mine/uploads', form)
        .then((result) => {
          setImages((prev) =>
            prev.map((slot) =>
              slot.id === id ? { ...slot, url: result.url, status: 'ready' } : slot,
            ),
          );
        })
        .catch((err) => {
          setImages((prev) =>
            prev.map((slot) =>
              slot.id === id ? { ...slot, status: 'error' } : slot,
            ),
          );
          setError(err instanceof Error ? err.message : 'آپلود تصویر ناموفق بود');
        })
        .finally(() => {
          pendingUploads.current.delete(id);
        });
      pendingUploads.current.set(id, task);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeImage(id: string) {
    const slot = images.find((item) => item.id === id);
    if (slot) URL.revokeObjectURL(slot.preview);
    pendingUploads.current.delete(id);
    setImages((prev) => prev.filter((item) => item.id !== id));
  }

  function resetForm() {
    setBody('');
    setTopicId('');
    setImages([]);
    setEditingId(null);
    setTagKind('');
    setTagTargetId('');
  }

  function editPost(post: FeedPost) {
    setEditingId(post.id);
    setBody(post.body ?? '');
    setTopicId(post.topicId ?? '');
    setTagKind((post.tagKind as 'BIOLINK' | 'BUSINESS_CARD' | null) ?? '');
    setTagTargetId(
      post.tagKind === 'BIOLINK'
        ? post.tagBiolinkId ?? ''
        : post.tagBusinessCardId ?? '',
    );
    setImages(
      post.images.map((url, index) => ({
        id: `saved-${post.id}-${index}`,
        preview: url,
        url,
        status: 'ready' as const,
      })),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Wait only for uploads that are still in flight; the user already wrote the
    // post while they ran in the background.
    if (pendingUploads.current.size) {
      setBusy(true);
      setMessage('در حال تکمیل آپلود تصاویر...');
      await Promise.allSettled([...pendingUploads.current.values()]);
    }
    const readyImages = images.filter((slot) => slot.status === 'ready' && slot.url);
    if (images.some((slot) => slot.status === 'error')) {
      setError('برخی تصاویر آپلود نشدند؛ لطفاً دوباره تلاش کنید یا آن‌ها را حذف کنید');
      setBusy(false);
      return;
    }
    if (!body.trim() && readyImages.length === 0) {
      setError('پست باید متن یا تصویر داشته باشد');
      setBusy(false);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        body: body.trim() || undefined,
        images: readyImages.map((slot) => slot.url as string),
        topicId: topicId || undefined,
        tagKind: tagKind || undefined,
        tagTargetId: tagKind ? tagTargetId || undefined : undefined,
      };
      if (editingId) {
        await api.patch(`/feeds/mine/${editingId}`, payload);
        setMessage('پست ویرایش شد و برای بررسی مجدد ارسال شد.');
      } else {
        await api.post('/feeds/mine', payload);
        setMessage(
          tagKind
            ? 'پست ثبت شد. پس از تأیید مدیر منتشر می‌شود و پس از تأیید پرداخت تگ، لینک کارت/بیولینک نمایش داده می‌شود.'
            : 'پست ثبت شد و پس از تأیید مدیر در فید منتشر می‌شود.',
        );
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت پست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function removePost(id: string) {
    if (!window.confirm('این پست حذف شود؟')) return;
    try {
      await api.delete(`/feeds/mine/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  const active = data?.active ?? null;
  const pendingSub = data?.subscriptions.find((s) => s.status === 'PENDING');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">فید من</h2>
        <p className="text-sm text-muted">
          انتشار پست (متن + عکس) رایگان است. هر پست پس از تأیید مدیر در دایرکتوری
          فیدها نمایش داده می‌شود. تنها قابلیت پرداختی، تگ‌کردن کارت ویزیت یا بیولینک
          خودتان روی پست است.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel flex flex-wrap items-center gap-3 p-4 text-sm">
        <span className="inline-flex items-center gap-1.5 font-bold text-ink">
          <BadgeCheck className="size-4 text-brand" aria-hidden />
          انتشار پست رایگان است
        </span>
        <span className="text-muted">
          فقط تگ‌کردن کارت ویزیت یا بیولینک روی پست هزینه دارد
          {data?.tagPrice
            ? ` (هر تگ ${data.tagPrice.toLocaleString('fa-IR')} تومان)`
            : ''}
          . پس از تأیید پرداخت توسط مدیر، لینک نمایش داده می‌شود.
        </span>
        {active ? (
          <span className="ms-auto inline-flex items-center gap-1.5 text-muted">
            <Sparkles className="size-4 text-brand" aria-hidden />
            بسته فعال: <b className="text-ink">{active.package?.name}</b>
          </span>
        ) : pendingSub ? (
          <span className="ms-auto text-amber-700">
            درخواست اشتراک فید شما در انتظار تأیید مدیر است.
          </span>
        ) : (
          <span className="ms-auto inline-flex items-center gap-1.5 text-muted">
            <Crown className="size-4 text-brand" aria-hidden />
            اشتراک فید اختیاری است و برای شمارش پست شماست.
          </span>
        )}
      </div>

      {!active && !pendingSub ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-ink">اشتراک فید (اختیاری)</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data?.packages.map((pkg) => (
              <div key={pkg.id} className="indeed-panel flex flex-col gap-2 p-4">
                <h4 className="font-extrabold text-ink">{pkg.name}</h4>
                {pkg.description ? (
                  <p className="text-xs leading-6 text-muted">{pkg.description}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {pkg.postsQuota.toLocaleString('fa-IR')} پست •{' '}
                  {pkg.durationDays.toLocaleString('fa-IR')} روز
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => requestPackage(pkg)}
                  className="indeed-btn indeed-btn-primary mt-auto py-2 text-sm disabled:opacity-60"
                >
                  درخواست اشتراک
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="indeed-panel flex flex-col gap-3 p-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <ImagePlus className="size-4 text-brand" aria-hidden />
            {editingId ? 'ویرایش پست' : 'پست جدید'}
          </h3>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="متن پست..."
            className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">بدون موضوع</option>
              {data?.topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) =>
                event.target.files ? void uploadFiles(event.target.files) : undefined
              }
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
            >
              <Upload className="size-4" aria-hidden />
              افزودن تصویر ({images.length}/{data?.limits.maxImages ?? 0})
            </button>
            <span className="text-xs text-muted">
              عکس‌ها در پس‌زمینه آپلود می‌شوند؛ می‌توانید هم‌زمان پست را بنویسید.
              حداکثر حجم هر تصویر: {data?.limits.maxImageKb.toLocaleString('fa-IR')} کیلوبایت
            </span>
          </div>

          {images.length ? (
            <div className="flex flex-wrap gap-2">
              {images.map((slot, index) => (
                <div key={slot.id} className="relative">
                  <Image
                    src={slot.preview}
                    alt={`تصویر ${index + 1}`}
                    width={72}
                    height={72}
                    className={cn(
                      'size-18 rounded-lg object-cover',
                      slot.status !== 'ready' && 'opacity-60',
                    )}
                    unoptimized
                  />
                  {slot.status === 'uploading' ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-white">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    </span>
                  ) : null}
                  {slot.status === 'error' ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-600/60 text-[10px] font-bold text-white">
                      خطا
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeImage(slot.id)}
                    className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-white"
                    aria-label="حذف تصویر"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
            >
              <Send className="size-4" aria-hidden />
              {editingId ? 'ذخیره ویرایش' : 'ثبت پست'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                انصراف
              </button>
            ) : null}
          </div>

          <div className="rounded-lg border border-dashed border-[var(--vintage-border)] p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Tag className="size-4 text-brand" aria-hidden />
              تگ کارت ویزیت یا بیولینک (اختیاری، پرداختی)
            </p>
            <p className="mt-1 text-xs text-muted">
              با تگ‌کردن، لینک کارت/بیولینک شما روی پست نمایش داده می‌شود. هزینه هر تگ
              {' '}
              {(data?.tagPrice ?? 0).toLocaleString('fa-IR')} تومان است و پس از تأیید
              پرداخت توسط مدیر فعال می‌شود.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={tagKind}
                onChange={(event) => {
                  setTagKind(event.target.value as '' | 'BIOLINK' | 'BUSINESS_CARD');
                  setTagTargetId('');
                }}
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">بدون تگ</option>
                <option value="BUSINESS_CARD">تگ کارت ویزیت</option>
                <option value="BIOLINK">تگ بیولینک</option>
              </select>
              {tagKind ? (
                <select
                  value={tagTargetId}
                  onChange={(event) => setTagTargetId(event.target.value)}
                  className="min-w-48 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                >
                  <option value="">انتخاب مورد...</option>
                  {(tagKind === 'BIOLINK' ? data?.taggableBiolinks : data?.taggableCards)?.map(
                    (item) => (
                      <option key={item.id} value={item.id}>
                        {item.company || item.fullName}
                      </option>
                    ),
                  )}
                </select>
              ) : null}
            </div>
            {tagKind &&
            ((tagKind === 'BIOLINK' ? data?.taggableBiolinks : data?.taggableCards)?.length ?? 0) ===
              0 ? (
              <p className="mt-2 text-xs text-amber-700">
                مورد منتشرشده‌ای برای تگ‌کردن ندارید. ابتدا یک کارت ویزیت یا بیولینک
                منتشر کنید.
              </p>
            ) : null}
          </div>
      </form>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold text-ink">پست‌های من</h3>
        {data?.posts.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.posts.map((post) => (
              <div
                key={post.id}
                className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm text-ink">
                    {post.body ?? '—'}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span>{faDate(post.createdAt)}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-bold',
                        post.status === 'APPROVED'
                          ? 'bg-green-50 text-green-700'
                          : post.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700',
                      )}
                    >
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                    <span>{post.images.length.toLocaleString('fa-IR')} تصویر</span>
                  </div>
                  {post.reason ? (
                    <p className="mt-1 text-xs text-red-600">دلیل رد: {post.reason}</p>
                  ) : null}
                  {post.tagKind ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      <Tag className="size-3.5 text-brand" aria-hidden />
                      {post.tagPaid ? (
                        <span className="text-green-700">
                          تگ تأییدشده: {post.tag?.company || post.tag?.fullName || 'لینک شما'}
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          تگ در انتظار تأیید پرداخت
                          {post.tagPrice
                            ? ` (${post.tagPrice.toLocaleString('fa-IR')} تومان)`
                            : ''}
                        </span>
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editPost(post)}
                    className="indeed-btn indeed-btn-secondary py-2 text-sm"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => removePost(post.id)}
                    className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="indeed-panel p-4 text-sm text-muted">هنوز پستی ثبت نکرده‌اید.</p>
        )}
      </section>
    </div>
  );
}
