'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Layers, Save, Trash2, X } from 'lucide-react';

import {
  api,
  type FeedPackage,
  type FeedPost,
  type FeedSubscription,
  type FeedTopic,
  type NewsStatus,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'posts' | 'subscriptions' | 'packages' | 'topics' | 'settings';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

const STATUS_FILTERS: NewsStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/**
 * Admin «فیدها» panel with tabs: post moderation, user subscriptions, package
 * management, topic management and the image limits (max images + max size).
 */
export function AdminFeeds() {
  const [tab, setTab] = useState<Tab>('posts');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['posts', 'بررسی پست‌ها'],
            ['subscriptions', 'اشتراک‌ها'],
            ['packages', 'بسته‌ها'],
            ['topics', 'موضوع‌ها'],
            ['settings', 'تنظیمات'],
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

      {tab === 'posts' ? <PostsModeration /> : null}
      {tab === 'subscriptions' ? <SubscriptionsPanel /> : null}
      {tab === 'packages' ? <PackagesPanel /> : null}
      {tab === 'topics' ? <TopicsPanel /> : null}
      {tab === 'settings' ? <FeedSettings /> : null}
    </div>
  );
}

function PostsModeration() {
  const [status, setStatus] = useState<NewsStatus>('PENDING');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await api.get<FeedPost[]>(`/admin/feeds/posts?status=${status}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await api.patch(`/admin/feeds/posts/${id}/moderate`, { decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تصمیم ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این پست حذف شود؟')) return;
    try {
      await api.delete(`/admin/feeds/posts/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={
              status === value
                ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                : 'indeed-btn indeed-btn-secondary py-2 text-sm'
            }
          >
            {STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : posts.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-muted">
          پستی در این وضعیت وجود ندارد.
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="indeed-panel flex flex-wrap gap-4 p-4">
            {post.images.length ? (
              <div className="flex gap-2">
                {post.images.slice(0, 4).map((image) => (
                  <Image
                    key={image}
                    src={image}
                    alt="تصویر پست"
                    width={72}
                    height={72}
                    className="size-18 rounded-lg object-cover"
                    unoptimized
                  />
                ))}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{post.body ?? '—'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{post.user?.fullName ?? post.user?.email ?? '—'}</span>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString('fa-IR')}</span>
                {post.topic ? <span>• {post.topic.name}</span> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.status === 'PENDING' ? (
                <>
                  <button
                    disabled={busyId === post.id}
                    onClick={() => decide(post.id, 'APPROVED')}
                    className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                  >
                    <Check className="size-4" aria-hidden />
                    تأیید
                  </button>
                  <button
                    disabled={busyId === post.id}
                    onClick={() => decide(post.id, 'REJECTED')}
                    className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600 disabled:opacity-60"
                  >
                    <X className="size-4" aria-hidden />
                    رد
                  </button>
                </>
              ) : null}
              <button
                onClick={() => remove(post.id)}
                className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600"
              >
                <Trash2 className="size-4" aria-hidden />
                حذف
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SubscriptionsPanel() {
  const [status, setStatus] = useState('PENDING');
  const [subs, setSubs] = useState<FeedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubs(
        await api.get<FeedSubscription[]>(`/admin/feeds/subscriptions?status=${status}`),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'ACTIVE' | 'REJECTED') {
    setBusyId(id);
    try {
      await api.patch(`/admin/feeds/subscriptions/${id}`, { decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تصمیم ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['PENDING', 'در انتظار'],
            ['ACTIVE', 'فعال'],
            ['REJECTED', 'ردشده'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={
              status === value
                ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                : 'indeed-btn indeed-btn-secondary py-2 text-sm'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : subs.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-muted">
          اشتراکی در این وضعیت وجود ندارد.
        </div>
      ) : (
        subs.map((sub) => (
          <div
            key={sub.id}
            className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <h4 className="font-extrabold text-ink">
                {sub.package?.name ?? 'بسته فید'}
              </h4>
              <p dir="ltr" className="text-xs text-muted">
                {sub.user?.email}
              </p>
              <p className="mt-1 text-xs text-muted">
                درخواست: {new Date(sub.requestedAt).toLocaleDateString('fa-IR')}
                {sub.expiresAt
                  ? ` • انقضا: ${new Date(sub.expiresAt).toLocaleDateString('fa-IR')}`
                  : ''}
              </p>
            </div>
            {sub.status === 'PENDING' ? (
              <div className="flex items-center gap-2">
                <button
                  disabled={busyId === sub.id}
                  onClick={() => decide(sub.id, 'ACTIVE')}
                  className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                >
                  <Check className="size-4" aria-hidden />
                  فعال‌سازی
                </button>
                <button
                  disabled={busyId === sub.id}
                  onClick={() => decide(sub.id, 'REJECTED')}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600 disabled:opacity-60"
                >
                  <X className="size-4" aria-hidden />
                  رد
                </button>
              </div>
            ) : (
              <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-muted">
                {sub.status === 'ACTIVE' ? 'فعال' : 'ردشده'}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PackagesPanel() {
  const [packages, setPackages] = useState<FeedPackage[]>([]);
  const [form, setForm] = useState({ id: '', name: '', postsQuota: '', durationDays: '30' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPackages(await api.get<FeedPackage[]>('/admin/feeds/packages'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const postsQuota = Number(form.postsQuota);
    const durationDays = Number(form.durationDays);
    if (!form.name.trim() || !Number.isInteger(postsQuota) || postsQuota < 1) {
      setError('نام و تعداد پست الزامی است');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { name: form.name.trim(), postsQuota, durationDays };
      if (form.id) {
        await api.patch(`/admin/feeds/packages/${form.id}`, payload);
      } else {
        await api.post('/admin/feeds/packages', payload);
      }
      setForm({ id: '', name: '', postsQuota: '', durationDays: '30' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این بسته حذف شود؟')) return;
    try {
      await api.delete(`/admin/feeds/packages/${id}`);
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
      <form onSubmit={save} className="indeed-panel flex flex-wrap items-end gap-3 p-5">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          نام بسته
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          تعداد پست
          <input
            type="number"
            min={1}
            dir="ltr"
            value={form.postsQuota}
            onChange={(event) => setForm({ ...form, postsQuota: event.target.value })}
            className="w-28 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          مدت (روز)
          <input
            type="number"
            min={1}
            dir="ltr"
            value={form.durationDays}
            onChange={(event) => setForm({ ...form, durationDays: event.target.value })}
            className="w-28 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden />
          {form.id ? 'ویرایش' : 'افزودن'}
        </button>
      </form>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <h4 className="font-extrabold text-ink">{pkg.name}</h4>
                <p className="text-xs text-muted">
                  {pkg.postsQuota.toLocaleString('fa-IR')} پست •{' '}
                  {pkg.durationDays.toLocaleString('fa-IR')} روز
                  {pkg.isActive ? '' : ' • غیرفعال'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setForm({
                      id: pkg.id,
                      name: pkg.name,
                      postsQuota: String(pkg.postsQuota),
                      durationDays: String(pkg.durationDays),
                    })
                  }
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  ویرایش
                </button>
                <button
                  onClick={() => remove(pkg.id)}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600"
                >
                  <Trash2 className="size-4" aria-hidden />
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

function TopicsPanel() {
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTopics(await api.get<FeedTopic[]>('/admin/feeds/topics'));
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
    try {
      await api.post('/admin/feeds/topics', { name: name.trim() });
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'افزودن ناموفق بود');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این موضوع حذف شود؟')) return;
    try {
      await api.delete(`/admin/feeds/topics/${id}`);
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
      <form onSubmit={add} className="indeed-panel flex items-end gap-3 p-5">
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-muted">
          موضوع جدید
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <button type="submit" className="indeed-btn indeed-btn-primary py-2 text-sm">
          افزودن
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <span
            key={topic.id}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-white px-3 py-1.5 text-sm"
          >
            <Layers className="size-3.5 text-brand" aria-hidden />
            {topic.name}
            <button
              onClick={() => remove(topic.id)}
              className="text-red-500 hover:text-red-700"
              aria-label="حذف"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function FeedSettings() {
  const [maxImages, setMaxImages] = useState('');
  const [maxKb, setMaxKb] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<{ feedMaxImages: number; feedMaxImageKb: number }>(
        '/admin/settings',
      );
      setMaxImages(String(result.feedMaxImages));
      setMaxKb(String(result.feedMaxImageKb));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const images = Number(maxImages);
    const kb = Number(maxKb);
    if (!Number.isInteger(images) || images < 1 || images > 20) {
      setError('تعداد تصویر مجاز باید بین ۱ تا ۲۰ باشد');
      return;
    }
    if (!Number.isInteger(kb) || kb < 64 || kb > 20480) {
      setError('حجم تصویر باید بین ۶۴ تا ۲۰۴۸۰ کیلوبایت باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<{ feedMaxImages: number; feedMaxImageKb: number }>(
        '/admin/settings',
        { feedMaxImages: images, feedMaxImageKb: kb },
      );
      setMaxImages(String(result.feedMaxImages));
      setMaxKb(String(result.feedMaxImageKb));
      setMessage('تنظیمات فید ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Layers className="size-5 text-brand" aria-hidden />
        محدودیت رسانه فید
      </h3>
      <p className="mt-1 text-xs text-muted">
        حداکثر تعداد تصویر مجاز برای هر پست و حداکثر حجم هر تصویر.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            حداکثر تعداد تصویر
            <input
              type="number"
              min={1}
              max={20}
              dir="ltr"
              value={maxImages}
              onChange={(event) => setMaxImages(event.target.value)}
              className="w-40 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            حداکثر حجم تصویر (کیلوبایت)
            <input
              type="number"
              min={64}
              max={20480}
              dir="ltr"
              value={maxKb}
              onChange={(event) => setMaxKb(event.target.value)}
              className="w-44 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
