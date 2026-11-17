'use client';

import { useCallback, useEffect, useState } from 'react';

import { api, type BusinessWorkspace } from './api';

/**
 * Shared loader for the modular business panel. The API is the source of truth
 * for which modules exist and which ones this workspace has enabled; the UI
 * never hard-codes module lists.
 */
export function useBusinessWorkspace(enabled = true) {
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await api.get<BusinessWorkspace>('/business-modules/my'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری پنل کسب‌وکار ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { workspace, setWorkspace, loading, error, reload };
}
