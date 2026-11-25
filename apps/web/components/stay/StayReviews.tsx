'use client';

import { useState } from 'react';

import { api, type AccommodationReview } from '@/lib/api';
import { toast } from '@/lib/toast';

export function StayReviews({
  slug,
  initial,
  reviewsCount,
}: {
  slug: string;
  initial: AccommodationReview[];
  reviewsCount?: number;
}) {
  const [reviews, setReviews] = useState<AccommodationReview[]>(initial);
  const [form, setForm] = useState({ guestName: '', rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.guestName.trim().length < 2) {
      toast.error('نام خود را وارد کنید.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/public/accommodations/${encodeURIComponent(slug)}/reviews`, {
        guestName: form.guestName.trim(),
        rating: form.rating,
        comment: form.comment.trim() || undefined,
      });
      setReviews(
        await api.get<AccommodationReview[]>(
          `/public/accommodations/${encodeURIComponent(slug)}/reviews`,
        ),
      );
      setForm({ guestName: '', rating: 5, comment: '' });
      toast.success('نظر شما ثبت شد. سپاس از بازخوردتان!');
    } catch {
      // API client already surfaced the error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="indeed-panel p-5">
      <h2 className="mb-3 text-lg font-extrabold text-ink">
        نظرات مهمانان
        {reviewsCount ? (
          <span className="ms-2 text-sm font-normal text-muted">
            ({reviewsCount.toLocaleString('fa-IR')} دیدگاه)
          </span>
        ) : null}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">هنوز دیدگاهی ثبت نشده است.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-ink">
                  {review.guestName} — ★ {review.rating.toLocaleString('fa-IR')}
                </span>
                <span className="text-xs text-muted">
                  {new Date(review.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
              {review.comment ? (
                <p className="mt-1 leading-7 text-muted">{review.comment}</p>
              ) : null}
              {review.reply ? (
                <p className="mt-2 rounded-lg bg-[var(--vintage-paper)] px-2 py-1.5 text-xs text-muted">
                  <b className="text-ink">پاسخ میزبان:</b> {review.reply}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 border-t border-[var(--vintage-border)] pt-4">
        <p className="text-sm font-bold text-ink">دیدگاه خود را ثبت کنید</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={form.guestName}
            onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))}
            placeholder="نام شما"
            className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
          />
          <select
            value={form.rating}
            onChange={(event) => setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
            className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
            aria-label="امتیاز"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {'★'.repeat(value)}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={form.comment}
          onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
          rows={3}
          placeholder="تجربه‌ی اقامت خود را بنویسید (اختیاری)"
          className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="indeed-btn indeed-btn-primary self-start disabled:opacity-60"
        >
          {submitting ? 'در حال ارسال…' : 'ثبت دیدگاه'}
        </button>
      </form>
    </section>
  );
}
