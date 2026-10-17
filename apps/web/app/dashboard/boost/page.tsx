'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DirectoryAdSection } from '@/components/dashboard/DirectoryAdSection';
import { useAuth } from '@/lib/auth';

/**
 * «افزایش بازدید» — kept as its own route for the existing sidebar link, but it
 * renders the same directory-ad flow that now also lives as a tab inside
 * «تبلیغات» (see `DirectoryAdSection`).
 */
export default function BoostPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">افزایش بازدید</h2>
        <p className="text-sm text-muted">
          تبلیغ کارت ویزیت یا بیولینک خود در صدر دایرکتوری.
        </p>
      </div>
      <DirectoryAdSection />
    </div>
  );
}
