'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { PointsPanel } from '@/components/dashboard/PointsPanel';
import { useAuth } from '@/lib/auth';

/**
 * «امتیاز من» — kept as its own route for the direct links (home page CTA,
 * notifications), but it renders the same `PointsPanel` that also lives as a
 * tab inside «شهروند خبرنگار».
 */
export default function PointsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();

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
      <PointsPanel />
    </div>
  );
}
