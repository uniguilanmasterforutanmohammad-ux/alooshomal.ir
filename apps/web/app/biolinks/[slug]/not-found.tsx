import Link from 'next/link';

export default function BiolinkNotFound() {
  return (
    <div className="container-page flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-extrabold text-ink">بیولینک پیدا نشد</h1>
      <p className="mt-3 max-w-md text-muted">
        این بیولینک وجود ندارد، منتشر نشده یا در انتظار تأیید مدیر است.
      </p>
      <Link href="/" className="indeed-btn indeed-btn-primary mt-6">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
