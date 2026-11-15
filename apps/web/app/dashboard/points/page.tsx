'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { PointsPanel } from '@/components/dashboard/PointsPanel';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';

/**
 * «امتیاز من» — kept as its own route for the direct links (home page CTA,
 * notifications), but it renders the same `PointsPanel` that also lives as a
 * tab inside «شهروند خبرنگار».
 */
export default function PointsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const { isFeatureVisible, loaded } = useFeatures();
  const disabled = loaded && !isFeatureVisible('featureNews');

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">امتیاز من</h2>
        <p className="text-sm text-muted">
          امتیازهای خود را ببینید و آن‌ها را صرف جوایز کنید.
        </p>
      </div>
      {disabled ? (
        <div className="indeed-panel p-8 text-center text-sm leading-7 text-muted">
          بخش «امتیاز من» همراه با قابلیت «شهروند خبرنگار» توسط مدیر غیرفعال شده است.
          <Link
            href="/dashboard"
            className="indeed-btn indeed-btn-secondary mt-4 w-fit py-2 text-xs"
          >
            بازگشت به داشبورد
          </Link>
        </div>
      ) : (
        <PointsPanel />
      )}
    </div>
  );
}
