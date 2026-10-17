'use client';

import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';

interface Props {
  /** API resource segment: `biolinks` or `business-cards`. */
  kind: 'biolinks' | 'business-cards';
  slug: string;
}

/**
 * Records a single «بازدید» (view) for the public item whose page just opened.
 *
 * The public pages are server-rendered and the scan endpoints are public POSTs,
 * so the view can only be attributed from the browser: this tiny client
 * component fires once per mount (per page load) and stays invisible. Without
 * it the `ScanEvent`/`BusinessCardScanEvent` rows were never created and the
 * «بازدید» counters stayed at zero.
 */
export function RecordView({ kind, slug }: Props) {
  // Guard against React's dev-only double effect invocation so one page load
  // records exactly one view.
  const recorded = useRef(false);

  useEffect(() => {
    if (!slug || recorded.current) return;
    recorded.current = true;
    void api
      .post(`/${kind}/public/${encodeURIComponent(slug)}/scan`)
      .catch(() => {
        /* a failed view record must never break the page */
      });
  }, [kind, slug]);

  return null;
}
