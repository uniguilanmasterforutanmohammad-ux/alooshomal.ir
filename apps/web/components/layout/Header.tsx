import Link from 'next/link';
import { BadgeCheck, IdCard, LayoutDashboard, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 hidden border-b-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9]/95 backdrop-blur md:block">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-brand">
          <span className="vintage-avatar flex size-9 items-center justify-center">
            <IdCard className="size-5" aria-hidden />
          </span>
          <span>آلوشمال</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          <Link href="/biolinks" className="hover:text-brand">
            دایرکتوری بیولینک
          </Link>
          <Link href="/business-cards" className="hover:text-brand">
            دایرکتوری کارت ویزیت
          </Link>
          <Link href="/pulse" className="hover:text-brand">
            نبض شهر
          </Link>
          <Link href="/dashboard" className="hover:text-brand">
            داشبورد
          </Link>
          <Link href="/admin" className="hover:text-brand">
            پنل مدیر
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="indeed-btn indeed-btn-secondary hidden sm:inline-flex">
            <LayoutDashboard className="size-4" aria-hidden />
            بیولینک‌های من
          </Link>
          <Link
            href="/dashboard/business-cards"
            className="indeed-btn indeed-btn-secondary hidden sm:inline-flex"
          >
            <BadgeCheck className="size-4" aria-hidden />
            کارت‌های ویزیت من
          </Link>
          <Link href="/register" className="indeed-btn indeed-btn-primary">
            <ShieldCheck className="size-4" aria-hidden />
            شروع کنید
          </Link>
        </div>
      </div>
    </header>
  );
}
