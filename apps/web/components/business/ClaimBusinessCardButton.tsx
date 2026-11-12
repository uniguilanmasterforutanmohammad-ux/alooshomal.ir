'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldQuestion } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { toast } from '@/lib/toast';

interface Props {
  businessCardId: string;
  slug: string;
  /** true for profiles the importer registered on behalf of their owner */
  isUnclaimed?: boolean;
  className?: string;
}

/**
 * «شما صاحب این کسب‌وکار هستید؟» — banner shown on a system-imported profile
 * (Behtarino etc.) so its real owner can take it over and finish the details.
 *
 * Guests are sent through login (and back to this page), signed-in visitors
 * claim the card with one click and land on its dashboard edit form. Like the
 * other owner-only widgets it waits for the session to hydrate, and the
 * «نمایش» switch of `featureBusinessClaim` hides it everywhere at once.
 */
export function ClaimBusinessCardButton({
  businessCardId,
  slug,
  isUnclaimed,
  className,
}: Props) {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [saving, setSaving] = useState(false);

  if (!isUnclaimed || !isFeatureVisible('featureBusinessClaim')) return null;
  // Ownership/action can only be resolved in the browser.
  if (!hydrated) return null;

  const editHref = `/dashboard/business-cards/${businessCardId}/edit`;
  const loginHref = `/login?next=${encodeURIComponent(`/business/${slug}`)}`;
  const message =
    'این کسب‌وکار به‌صورت سیستمی از یک مرجع عمومی ثبت شده است. اگر صاحب آن هستید، مالکیت آن را بگیرید و مشخصات را کامل کنید.';

  async function claim() {
    setSaving(true);
    try {
      await api.post(`/business-cards/${businessCardId}/claim`);
      toast.success('این کسب‌وکار به حساب شما واگذار شد. مشخصات را کامل کنید.');
      router.push(editHref);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'واگذاری کسب‌وکار ناموفق بود');
      setSaving(false);
    }
  }

  return (
    <div
      className={[
        'mb-4 flex flex-col gap-3 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4 sm:flex-row sm:items-center sm:justify-between',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="vintage-avatar flex size-10 shrink-0 items-center justify-center">
          <ShieldQuestion className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-extrabold text-ink">صاحب این کسب‌وکار هستید؟</p>
          <p className="mt-1 text-xs leading-6 text-muted">{message}</p>
        </div>
      </div>
      {token ? (
        <button
          type="button"
          onClick={claim}
          disabled={saving}
          className="indeed-btn indeed-btn-primary shrink-0 py-2 text-sm disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldQuestion className="size-4" aria-hidden />
          )}
          شما صاحب این کسب‌وکار هستید
        </button>
      ) : (
        <Link
          href={loginHref}
          prefetch={false}
          className="indeed-btn indeed-btn-primary shrink-0 py-2 text-sm"
        >
          <ShieldQuestion className="size-4" aria-hidden />
          شما صاحب این کسب‌وکار هستید
        </Link>
      )}
    </div>
  );
}
