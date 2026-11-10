import Link from 'next/link';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function BusinessNotFound() {
  return (
    <div className="min-h-screen bg-soft">
      <Header />
      <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-bold text-brand">خطای ۴۰۴</p>
        <h1 className="mt-2 text-3xl font-black text-ink">کسب‌وکار پیدا نشد</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted">
          این صفحه کسب‌وکار وجود ندارد، حذف شده یا هنوز منتشر نشده است. می‌توانید از
          فهرست دسته‌بندی‌ها کسب‌وکار موردنظرتان را پیدا کنید.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/categories" className="indeed-btn indeed-btn-primary">
            دسته‌بندی مشاغل
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
