'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Layers, Sparkles } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface SuggestedManagement {
  key: string;
  label: string;
  description: string;
  totalPrice: number;
  purchased: boolean;
  paidUntil: string | null;
  canPurchase: boolean;
}

/**
 * Encourages the user to buy the «مدیریت کسب‌وکار» that matches their
 * business category. Renders nothing once the matching package is purchased,
 * so it only ever appears while the workspace is still missing its package.
 */
export function ManagementNudge({
  variant = 'panel',
}: {
  variant?: 'panel' | 'banner';
}) {
  const { token, hydrated } = useAuth();
  const [suggested, setSuggested] = useState<SuggestedManagement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hydrated || !token) return;
    api
      .get<SuggestedManagement | null>(
        '/business-modules/suggested-management',
      )
      .then((data) => setSuggested(data))
      .catch(() => setSuggested(null))
      .finally(() => setLoaded(true));
  }, [hydrated, token]);

  if (!loaded || !suggested || suggested.purchased) return null;

  const priceLabel =
    suggested.totalPrice > 0
      ? `${suggested.totalPrice.toLocaleString('fa-IR')} تومان در ماه`
      : 'رایگان';

  const ctaHref = suggested.canPurchase
    ? '/dashboard/business/overview'
    : '/dashboard/subscriptions';
  const ctaLabel = suggested.canPurchase
    ? 'خرید و فعال‌سازی'
    : 'ارتقای اشتراک';

  if (variant === 'banner') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand-light px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-extrabold text-ink">
              بسته‌ی «{suggested.label}» برای کسب‌وکار شما آماده است
            </p>
            <p className="text-[11px] leading-6 text-muted">
              {suggested.canPurchase
                ? `برای فعال‌سازی ماژول‌های تخصصی این صنف، مدیریت کسب‌وکار را خریداری کنید (${priceLabel}).`
                : 'برای خرید مدیریت کسب‌وکار، ابتدا اشتراک خود را به اکو یا پلاس ارتقا دهید.'}
            </p>
          </div>
        </div>
        <Link
          href={ctaHref}
          className="indeed-btn indeed-btn-primary shrink-0 py-2 text-xs"
        >
          {ctaLabel}
          <ArrowLeft className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="indeed-panel flex flex-col gap-3 border-brand/40 p-5">
      <div className="flex items-center gap-2">
        <span className="vintage-avatar flex size-9 items-center justify-center">
          <Layers className="size-4" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-ink">
            مدیریت کسب‌وکار «{suggested.label}»
          </h3>
          <p className="text-[11px] text-muted">
            متناسب با دسته‌بندی کسب‌وکار شما
          </p>
        </div>
      </div>
      <p className="text-xs leading-6 text-muted">{suggested.description}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-brand">{priceLabel}</span>
        <Link
          href={ctaHref}
          className="indeed-btn indeed-btn-primary py-2 text-xs"
        >
          {ctaLabel}
          <ArrowLeft className="size-3.5" aria-hidden />
        </Link>
      </div>
      {!suggested.canPurchase ? (
        <p className="text-[11px] text-amber-700">
          اشتراک فعلی شما امکان خرید مدیریت کسب‌وکار را ندارد؛ ابتدا ارتقا دهید.
        </p>
      ) : null}
    </div>
  );
}
