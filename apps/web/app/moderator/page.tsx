'use client';

import { Suspense } from 'react';

import { ModeratorPanel } from '@/components/moderator/ModeratorPanel';

export default function ModeratorPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-muted">در حال بارگذاری...</div>}
    >
      <ModeratorPanel />
    </Suspense>
  );
}
