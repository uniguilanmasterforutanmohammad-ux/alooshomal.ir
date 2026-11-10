'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, MessageSquarePlus, Pencil, Star, Trash2 } from 'lucide-react';

import {
  api,
  type BusinessReview,
  type BusinessReviewsPage,
  type ReviewSummary,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { fa, formatJalali } from '@/lib/jalali';
import { toast } from '@/lib/toast';
import { RatingStars } from './RatingStars';

interface Props {
  slug: string;
  initial: BusinessReviewsPage;
  ownerUserId?: string | null;
}

const STAR_VALUES = [5, 4, 3, 2, 1];

/**
 * Reviews + rating block on the public business profile: aggregate summary,
 * star distribution, the paginated review list and the signed-in user's
 * create/edit/delete form. Server-rendered with the first page, then fully
 * interactive on the client.
 */
export function BusinessReviews({ slug, initial, ownerUserId }: Props) {
  const { token, user, hydrated } = useAuth();
  const { features, isFeatureVisible } = useFeatures();
  const [data, setData] = useState(initial);
  const [mine, setMine] = useState<BusinessReview | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const canReview = features.featureBusinessReviews !== false;
  const visible = isFeatureVisible('featureBusinessReviews');
  const isOwner = Boolean(user && ownerUserId && user.id === ownerUserId);

  useEffect(() => {
    if (!hydrated || !token || !canReview) return;
    let active = true;
    api
      .get<{ review: BusinessReview | null }>(
        `/business-reviews/public/${encodeURIComponent(slug)}/mine`,
      )
      .then((result) => {
        if (!active) return;
        setMine(result.review);
        if (result.review) {
          setRating(result.review.rating);
          setComment(result.review.comment ?? '');
          setData((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === result.review?.id ? { ...item, mine: true } : item,
            ),
          }));
        }
      })
      .catch(() => {
        // A failed prefill must not break the public page; the form stays empty.
      });
    return () => {
      active = false;
    };
  }, [hydrated, token, slug, canReview]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.post<{
        review: BusinessReview;
        summary: ReviewSummary;
      }>(`/business-reviews/public/${encodeURIComponent(slug)}`, {
        rating,
        comment: comment.trim() || undefined,
      });
      setMine(result.review);
      setData((prev) => ({
        ...prev,
        summary: result.summary,
        items: [
          result.review,
          ...prev.items.filter((item) => item.id !== result.review.id),
        ],
        meta: { ...prev.meta, total: result.summary.count },
      }));
      toast.success(
        result.review.updatedAt !== result.review.createdAt
          ? 'دیدگاه شما به‌روزرسانی شد.'
          : 'دیدگاه شما ثبت شد. ممنون!',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('دیدگاه و امتیاز خود را حذف می‌کنید؟')) return;
    setDeleting(true);
    try {
      const result = await api.delete<{ summary: ReviewSummary }>(
        `/business-reviews/public/${encodeURIComponent(slug)}/mine`,
      );
      setData((prev) => ({
        ...prev,
        summary: result.summary,
        items: prev.items.filter((item) => !item.mine && item.id !== mine?.id),
        meta: { ...prev.meta, total: result.summary.count },
      }));
      setMine(null);
      setRating(5);
      setComment('');
      toast.success('دیدگاه شما حذف شد.');
    } finally {
      setDeleting(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await api.get<BusinessReviewsPage>(
        `/business-reviews/public/${encodeURIComponent(slug)}?page=${data.meta.page + 1}`,
      );
      setData((prev) => ({
        ...next,
        items: [...prev.items, ...next.items.filter((item) => !prev.items.some((old) => old.id === item.id))],
      }));
    } finally {
      setLoadingMore(false);
    }
  }

  const { summary } = data;

  return (
    <section id="reviews" className="biz-section">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">
            دیدگاه‌ها درباره این کسب‌وکار
          </h2>
          <p className="mt-1 text-sm text-muted">
            نظر شما به دیگران کمک می‌کند انتخاب بهتری داشته باشند.
          </p>
        </div>
        <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-muted">
          {summary.count > 0 ? `${fa(summary.count)} دیدگاه` : 'بدون دیدگاه'}
        </span>
      </div>

      <div className="biz-review-summary">
        <div className="biz-review-score">
          <span className="text-4xl font-black text-ink">
            {summary.count > 0 ? summary.average.toLocaleString('fa-IR') : '—'}
          </span>
          <RatingStars rating={summary.average} hideValue className="size-5" />
          <span className="text-xs text-muted">
            از {fa(summary.count)} دیدگاه
          </span>
        </div>
        <div className="biz-review-bars">
          {STAR_VALUES.map((value) => {
            const count = summary.distribution[String(value)] ?? 0;
            const percent = summary.count > 0 ? (count / summary.count) * 100 : 0;
            return (
              <div key={value} className="biz-review-bar-row">
                <span className="flex items-center gap-1 text-xs text-muted">
                  {fa(value)} <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <span className="biz-review-bar">
                  <span style={{ width: `${percent}%` }} />
                </span>
                <span className="text-xs text-muted">{fa(count)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {canReview && visible ? (
        isOwner ? (
          <div className="biz-review-note">
            این کسب‌وکار متعلق به شماست؛ امکان ثبت دیدگاه برای مالک غیرفعال است.
          </div>
        ) : !hydrated ? (
          <div className="biz-review-note">در حال بارگذاری فرم دیدگاه…</div>
        ) : !token ? (
          <div className="biz-review-cta">
            <MessageSquarePlus className="size-5 text-brand" aria-hidden />
            <p>برای ثبت دیدگاه و امتیاز وارد حساب کاربری خود شوید.</p>
            <Link
              href={`/login?next=${encodeURIComponent(`/business/${slug}`)}`}
              className="indeed-btn indeed-btn-primary"
            >
              ورود و ثبت دیدگاه
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="biz-review-form">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-ink">
                {mine ? 'دیدگاه شما' : 'دیدگاه خود را ثبت کنید'}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="امتیاز">
              {STAR_VALUES.slice()
                .reverse()
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} ستاره`}
                    onClick={() => setRating(value)}
                    className="rounded p-0.5 transition hover:scale-110"
                  >
                    <Star
                      className={
                        value <= rating
                          ? 'size-7 fill-amber-400 text-amber-500'
                          : 'size-7 text-[var(--vintage-border)]'
                      }
                    />
                  </button>
                ))}
              <span className="mr-2 text-sm font-bold text-ink">
                {fa(rating)} از ۵
              </span>
            </div>
            <textarea
              className="indeed-input mt-3 min-h-24 resize-y"
              maxLength={1000}
              placeholder="تجربه خود از این کسب‌وکار را بنویسید (اختیاری)…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="indeed-btn indeed-btn-primary disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MessageSquarePlus className="size-4" aria-hidden />
                )}
                {mine ? 'ذخیره تغییرات' : 'ثبت دیدگاه'}
              </button>
              {mine ? (
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={deleting}
                  className="indeed-btn border border-red-200 bg-red-50 text-red-600 disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-4" aria-hidden />
                  )}
                  حذف دیدگاه
                </button>
              ) : null}
            </div>
          </form>
        )
      ) : (
        <div className="biz-review-note">
          ثبت دیدگاه و امتیاز موقتاً غیرفعال است؛ دیدگاه‌های قبلی همچنان نمایش داده می‌شوند.
        </div>
      )}

      {data.items.length === 0 ? (
        <div className="biz-review-empty">
          <Star className="size-8 text-[var(--vintage-border)]" aria-hidden />
          <p className="font-bold text-ink">اولین دیدگاه این کسب‌وکار را شما ثبت کنید.</p>
          <p className="text-sm text-muted">
            نظر شما مهم و اثرگذار است و به بقیه کمک می‌کند بهتر انتخاب کنند.
          </p>
        </div>
      ) : (
        <ul className="biz-review-list">
          {data.items.map((review) => (
            <li key={review.id} className="biz-review-item">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-extrabold text-brand">
                    {review.authorName.trim().slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {review.authorName}
                      {review.mine ? (
                        <span className="mr-2 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                          دیدگاه شما
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted">{formatJalali(review.createdAt)}</p>
                  </div>
                </div>
                <RatingStars rating={review.rating} hideValue className="size-4" />
              </div>
              {review.comment ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink">
                  {review.comment}
                </p>
              ) : null}
              {review.mine ? (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRating(review.rating);
                      setComment(review.comment ?? '');
                      document
                        .querySelector('.biz-review-form')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    ویرایش
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {data.meta.hasNext ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="indeed-btn indeed-btn-secondary mt-4 w-full disabled:opacity-60"
        >
          {loadingMore ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          نمایش دیدگاه‌های بیشتر
        </button>
      ) : null}
    </section>
  );
}
