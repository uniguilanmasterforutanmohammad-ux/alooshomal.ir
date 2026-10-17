'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * «تبلیغات» was merged into «افزایش بازدید» (both the «پله» and the home-page
 * ad live in the same table there). Keep the old route as a redirect so old
 * links and notifications still land in the right place.
 */
export default function AdsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/boost');
  }, [router]);

  return <p className="text-muted">در حال انتقال به «افزایش بازدید»...</p>;
}
