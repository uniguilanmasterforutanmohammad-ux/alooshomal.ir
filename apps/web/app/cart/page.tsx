import type { Metadata } from 'next';

import { Header } from '@/components/layout/Header';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { CartView } from '@/components/shop/CartView';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';

export const metadata: Metadata = {
  title: 'سبد خرید',
  description: 'سبد خرید مشترک محصولات فروشگاه‌های آنلاین شمالی‌کارت.',
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/cart')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="سبد خرید" />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">سبد خرید</h1>
          <p className="mt-1 text-sm text-muted">
            محصولات انتخاب‌شده از فروشگاه‌ها؛ هر فروشگاه سفارش خودش را جداگانه
            تأیید می‌کند.
          </p>
        </div>
        <CartView />
      </main>
    </>
  );
}
