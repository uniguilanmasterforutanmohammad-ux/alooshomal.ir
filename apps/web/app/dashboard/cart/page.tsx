'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

import { CartView } from '@/components/shop/CartView';
import { useFeatures } from '@/lib/features';

export default function DashboardCartPage() {
  const { isFeatureVisible, loaded } = useFeatures();
  const disabled = loaded && !isFeatureVisible('featureRetailCart');

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">سبد خرید</h1>
        <p className="mt-1 text-sm text-muted">
          کالاهای انتخاب‌شده از فروشگاه‌ها؛ هر فروشگاه سفارش خودش را جداگانه
          تأیید می‌کند.
        </p>
      </header>

      {disabled ? (
        <div className="indeed-panel flex flex-col items-center gap-3 p-10 text-center">
          <ShoppingBag className="size-10 text-muted" aria-hidden />
          <p className="text-sm font-bold text-ink">
            سبد خرید موقتاً غیرفعال است.
          </p>
          <Link href="/dashboard" className="indeed-btn indeed-btn-secondary">
            بازگشت به پنل
          </Link>
        </div>
      ) : (
        <CartView />
      )}
    </div>
  );
}
