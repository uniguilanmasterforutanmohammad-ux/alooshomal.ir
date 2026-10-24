import Link from 'next/link';
import { PowerOff } from 'lucide-react';

/**
 * Shown instead of the real content when the admin has stopped a public area's
 * display (the «نمایش» switch of the feature that owns it). It reuses the site
 * shell (the caller renders the `<Header/>`), so the visitor keeps their
 * navigation and only the section itself is replaced by this friendly notice.
 */
export function StoppedSectionScreen({ title }: { title: string }) {
  return (
    <main className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="indeed-panel max-w-md p-8 text-center">
        <span className="vintage-avatar mx-auto flex size-14 items-center justify-center">
          <PowerOff className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-extrabold text-ink">
          نمایش «{title}» موقتاً متوقف شده است
        </h1>
        <p className="mt-2 text-sm text-muted">
          این بخش به‌صورت موقت توسط مدیر غیرفعال شده و به‌زودی بازمی‌گردد. سایر بخش‌های
          سایت در دسترس هستند.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/" className="indeed-btn indeed-btn-primary py-2 text-sm">
            بازگشت به صفحه‌ی اصلی
          </Link>
          <Link href="/business-cards" className="indeed-btn indeed-btn-secondary py-2 text-sm">
            مشاهده‌ی کارت‌های ویزیت
          </Link>
        </div>
      </div>
    </main>
  );
}
