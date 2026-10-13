'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Sign-up and sign-in now share a single page (`/login`). This route only
 * forwards old links — keeping any `?next=` target — so existing bookmarks and
 * external links keep working.
 */
function RegisterRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const next = params.get('next');
    router.replace(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  }, [router, params]);
  return (
    <div className="container-page flex min-h-screen items-center justify-center py-12">
      <div className="indeed-panel w-full max-w-md p-8 text-center text-sm text-muted">
        در حال انتقال به صفحه‌ی ورود/ثبت‌نام...
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-screen items-center justify-center py-12">
          <div className="indeed-panel w-full max-w-md p-8 text-center text-sm text-muted">
            در حال انتقال به صفحه‌ی ورود/ثبت‌نام...
          </div>
        </div>
      }
    >
      <RegisterRedirect />
    </Suspense>
  );
}
