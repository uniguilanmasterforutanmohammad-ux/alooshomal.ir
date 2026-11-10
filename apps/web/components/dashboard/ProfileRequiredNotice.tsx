'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

/** Shown instead of a create form until the identity fields are filled in. */
export function ProfileRequiredNotice({ action }: { action?: string }) {
  return (
    <div className="indeed-panel p-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldAlert className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-ink">
        ابتدا استعلام هویت را کامل کنید
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
        برای {action ?? 'این کار'} لازم است نام، نام خانوادگی و کد ملی شما از
        طریق استعلام هویت ثبت شده باشد. این کار در بخش «شروع آسان» انجام می‌شود و
        اطلاعات به‌صورت خودکار در پروفایل شما قرار می‌گیرد.
      </p>
      <Link
        href="/dashboard/onboarding"
        className="indeed-btn indeed-btn-primary mt-5 inline-flex"
      >
        شروع آسان
      </Link>
    </div>
  );
}
