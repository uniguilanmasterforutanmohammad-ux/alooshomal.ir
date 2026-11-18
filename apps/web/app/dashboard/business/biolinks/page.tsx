'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { MyBiolinksPanel } from '@/components/business/MyBiolinksPanel';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';

export default function BiolinksTabPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const { workspace } = useBusinessWorkspace(hydrated && Boolean(token));

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/biolinks');
    }
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">بیولینک</h1>
        <p className="mt-1 text-sm text-muted">
          صفحه‌ی لینک‌های شخصی/کسب‌وکار برای اینستاگرام و شبکه‌های اجتماعی.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <MyBiolinksPanel />
    </div>
  );
}
