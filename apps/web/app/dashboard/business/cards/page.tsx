'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { MyBusinessCardsPanel } from '@/components/business/MyBusinessCardsPanel';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';

export default function BusinessCardsTabPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const { workspace } = useBusinessWorkspace(hydrated && Boolean(token));

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/cards');
    }
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">کارت ویزیت دیجیتال</h1>
        <p className="mt-1 text-sm text-muted">
          کارت ویزیت عمومی کسب‌وکار با اطلاعات تماس، گالری و لینک‌های اجتماعی.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <MyBusinessCardsPanel />
    </div>
  );
}
