import Link from 'next/link';

export default function BusinessCardNotFound() {
  return (
    <div className="container-page flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-extrabold text-ink">کارت ویزیت پیدا نشد</h1>
      <p className="mt-3 max-w-md text-muted">
        این کارت ویزیت وجود ندارد، منتشر نشده یا در انتظار تأیید مدیر است.
      </p>
      <Link href="/" className="indeed-btn indeed-btn-primary mt-6">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
