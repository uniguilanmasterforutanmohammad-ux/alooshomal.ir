'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BoostSearchForm, BoostTable } from '@/components/dashboard/BoostTable';
import { api, type BoostOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * «افزایش بازدید» — the merged boost + advertising panel. The former
 * «تبلیغات» page now redirects here (see `/dashboard/ads`). One table per kind
 * (biolink / business card / feed) with both the «پله» (directory) and
 * «تبلیغ صفحه اول» actions, search and pagination.
 */
export default function BoostPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [data, setData] = useState<BoostOverview | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set('q', query);
      setData(await api.get<BoostOverview>(`/boosts/overview?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(draft.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-ink">افزایش بازدید</h2>
        <p className="text-sm text-muted">
          با «پله» موردی را به صدر دایرکتوری خودش برسانید و با «تبلیغ صفحه اول» آن را در
          باکس تبلیغات صفحه اصلی نمایش دهید. هر درخواست پس از تأیید مدیر فعال می‌شود.
        </p>
      </div>

      <BoostSearchForm value={draft} onChange={setDraft} onSubmit={submitSearch} />

      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <BoostTable
        data={data}
        loading={loading}
        page={page}
        onPage={setPage}
        onReload={load}
        onError={setError}
        onMessage={setMessage}
      />
    </div>
  );
}
