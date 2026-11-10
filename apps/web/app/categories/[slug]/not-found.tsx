import Link from 'next/link';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function CategoryNotFound() {
  return (
    <div className="min-h-screen bg-soft">
      <Header />
      <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-bold text-brand">خطای ۴۰۴</p>
        <h1 className="mt-2 text-3xl font-black text-ink">دسته‌بندی پیدا نشد</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted">
          این دسته‌بندی وجود ندارد یا هنوز کسب‌وکاری در آن ثبت نشده است. از فهرست
          کامل دسته‌بندی‌ها، شغل موردنظرتان را انتخاب کنید.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/categories" className="indeed-btn indeed-btn-primary">
            همه دسته‌بندی‌ها
          </Link>
          <Link href="/" className="indeed-btn indeed-btn-secondary">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
