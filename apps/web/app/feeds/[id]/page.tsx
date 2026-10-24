'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FeedTagCard } from '@/components/feed/FeedTagCard';
import { api, type FeedPost } from '@/lib/api';
import { bodyToHtml, richTextPreview } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

/**
 * Single feed post. Loads the post client-side (so the like/save buttons can
 * use the browser's visitor id / auth token) and shows the images in a
 * swipeable row with a like + save bar.
 */
export default function FeedPostPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    api
      .get<FeedPost>(`/feeds/public/${id}`)
      .then((result) => {
        if (mounted) setPost(result);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری'),
      )
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  async function toggleLike() {
    if (!post || busy) return;
    setBusy(true);
    const next = !post.liked;
    setPost({ ...post, liked: next, likeCount: post.likeCount + (next ? 1 : -1) });
    try {
      const result = await api.post<{ liked: boolean; likeCount: number }>(
        `/feeds/public/${post.id}/like`,
      );
      setPost((prev) =>
        prev ? { ...prev, liked: result.liked, likeCount: result.likeCount } : prev,
      );
    } catch {
      setPost((prev) =>
        prev ? { ...prev, liked: !next, likeCount: post.likeCount } : prev,
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave() {
    if (!post || busy) return;
    setBusy(true);
    const next = !post.saved;
    setPost({ ...post, saved: next });
    try {
      const result = await api.post<{ saved: boolean }>(
        `/feeds/public/${post.id}/save`,
      );
      setPost((prev) => (prev ? { ...prev, saved: result.saved } : prev));
    } catch {
      setPost((prev) => (prev ? { ...prev, saved: !next } : prev));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="container-page max-w-2xl py-8">
        <Link href="/feeds" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به فیدها
        </Link>

        {loading ? (
          <p className="mt-4 text-muted">در حال بارگذاری...</p>
        ) : error || !post ? (
          <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error ?? 'پست فید یافت نشد'}
          </p>
        ) : (
          <article className="indeed-panel mt-4 overflow-hidden">
            {post.images.length ? (
              <div className="relative aspect-square w-full bg-soft">
                <Image
                  src={post.images[active]}
                  alt={richTextPreview(post.body).slice(0, 40) || 'پست فید'}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : null}

            {post.images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-2">
                {post.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActive(index)}
                    className={cn(
                      'relative size-14 shrink-0 overflow-hidden rounded-md border-2',
                      index === active ? 'border-brand' : 'border-transparent',
                    )}
                  >
                    <Image
                      src={image}
                      alt={`تصویر ${index + 1}`}
                      width={56}
                      height={56}
                      className="size-14 object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-4" aria-hidden />
                  <b className="text-ink">{post.user?.fullName ?? 'کاربر'}</b>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden />
                  {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('fa-IR')}
                </span>
                {post.topic ? (
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
                    {post.topic.name}
                  </span>
                ) : null}
              </div>

              {post.body ? (
                <div
                  className="mt-4 feed-rich"
                  // Sanitised through the allow-list in `lib/rich-text`.
                  dangerouslySetInnerHTML={{ __html: bodyToHtml(post.body) }}
                />
              ) : null}

              {post.tag ? <FeedTagCard tag={post.tag} /> : null}

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={busy}
                  className={cn(
                    'indeed-btn py-2 text-sm',
                    post.liked
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'indeed-btn-secondary',
                  )}
                >
                  ♥ {post.likeCount.toLocaleString('fa-IR')} پسندیدن
                </button>
                <button
                  type="button"
                  onClick={toggleSave}
                  disabled={busy}
                  className={cn(
                    'indeed-btn py-2 text-sm',
                    post.saved
                      ? 'border-amber-200 bg-amber-50 text-amber-600'
                      : 'indeed-btn-secondary',
                  )}
                >
                  {post.saved ? 'ذخیره شد' : 'ذخیره'}
                </button>
              </div>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </>
  );
}
