'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Pencil, Search, X } from 'lucide-react';

import { ModeratorShell, type ModeratorScopeTab } from './ModeratorShell';
import { BiolinkLiveEditor } from '@/components/admin/BiolinkLiveEditor';
import { BusinessCardLiveEditor } from '@/components/admin/BusinessCardLiveEditor';
import { AdminNewsEditor } from '@/components/admin/AdminNewsEditor';
import { ModeratorFeedEditor } from './ModeratorFeedEditor';
import { api, type ModeratorMe, type ModeratorScope, type NewsStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  fullName?: string;
  title?: string;
  body?: string | null;
  images?: string[];
  slug?: string;
  status?: string;
  createdAt?: string;
  jobTitle?: string | null;
  company?: string | null;
  user?: { email?: string | null; fullName?: string | null } | null;
  author?: { email?: string | null; fullName?: string | null } | null;
  topic?: { name: string } | null;
  category?: { name: string } | null;
}

const SCOPE_LABELS: Record<ModeratorScope, string> = {
  BIOLINK: 'بیولینک‌ها',
  BUSINESS_CARD: 'کارت‌های ویزیت',
  FEED: 'فیدها',
  NEWS: 'نبض شهر',
};

const STATUS_FILTERS: NewsStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const STATUS_LABEL: Record<NewsStatus, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

/**
 * The limited «کاربر ادمین» review panel: pick a granted content scope, browse
 * the queue on a phone/tablet, then approve, edit or reject each item inline.
 * Everything here is deliberately touch-first: one column, large tap targets,
 * and the edit preview opens right under the tapped card.
 */
export function ModeratorPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, hydrated } = useAuth();

  const [me, setMe] = useState<ModeratorMe | null>(null);
  const [status, setStatus] = useState<NewsStatus>('PENDING');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const urlScope = searchParams.get('scope') as ModeratorScope | null;
  const scope: ModeratorScope | null =
    urlScope && me?.scopes.includes(urlScope) ? urlScope : (me?.scopes[0] ?? null);

  const setScope = useCallback(
    (next: ModeratorScope) => {
      setEditingId(null);
      router.replace(`/moderator?scope=${next}`, { scroll: false });
    },
    [router],
  );

  // Load identity + granted scopes once.
  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login?next=/moderator');
      return;
    }
    if (user && user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    api
      .get<ModeratorMe>('/moderator/me')
      .then(setMe)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا در بارگذاری'));
  }, [hydrated, token, user, router]);

  const loadQueue = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<QueueItem[]>(
        `/moderator/queue/${scope}?status=${status}`,
      );
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری صف');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope, status]);

  useEffect(() => {
    if (scope) void loadQueue();
  }, [scope, loadQueue]);

  async function decide(item: QueueItem, decision: 'APPROVED' | 'REJECTED') {
    if (!scope) return;
    let reason: string | undefined;
    if (decision === 'REJECTED') {
      const input = window.prompt('دلیل رد:');
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    setBusyId(item.id);
    try {
      await api.patch(`/moderator/item/${scope}/${item.id}/decide`, {
        decision,
        reason,
      });
      toast.success(decision === 'APPROVED' ? 'تأیید شد.' : 'رد شد.');
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setEditingId(null);
      // Refresh the pending badge counts.
      void api.get<ModeratorMe>('/moderator/me').then(setMe).catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'عملیات ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  const tabs: ModeratorScopeTab[] =
    me?.scopes.map((value) => ({
      scope: value,
      label: SCOPE_LABELS[value],
      pending: me.pending[value],
    })) ?? [];

  const filtered = query.trim()
    ? items.filter((item) => {
        const haystack = `${item.fullName ?? ''} ${item.title ?? ''} ${
          item.body ?? ''
        } ${item.user?.fullName ?? item.author?.fullName ?? ''}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      })
    : items;

  return (
    <ModeratorShell tabs={tabs} active={scope ?? ''} onTab={(s) => setScope(s as ModeratorScope)}>
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2.5">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="جستجو در صف..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              onClick={() => {
                setStatus(value);
                setEditingId(null);
              }}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition',
                status === value
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-[var(--vintage-border)] bg-white text-muted',
              )}
            >
              {STATUS_LABEL[value]}
            </button>
          ))}
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--vintage-border)] bg-white p-6 text-center text-sm text-muted">
            موردی در این وضعیت وجود ندارد.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((item) => (
              <li key={item.id}>
                <ModeratorCard
                  scope={scope as ModeratorScope}
                  item={item}
                  busy={busyId === item.id}
                  onApprove={() => decide(item, 'APPROVED')}
                  onReject={() => decide(item, 'REJECTED')}
                  onEdit={() =>
                    setEditingId((current) => (current === item.id ? null : item.id))
                  }
                  editing={editingId === item.id}
                />
              </li>
            ))}
          </ul>
        )}

        {scope === 'FEED' && editingId ? (
          <ModeratorFeedEditor
            feedPostId={editingId}
            onClose={() => setEditingId(null)}
            onChanged={() => {
              setEditingId(null);
              void loadQueue();
            }}
          />
        ) : null}
        {scope === 'NEWS' && editingId ? (
          <AdminNewsEditor
            newsId={editingId}
            allowDelete={false}
            itemPath={(id) => `/moderator/item/NEWS/${id}`}
            categoriesPath="/moderator/news-categories"
            onClose={() => setEditingId(null)}
            onChanged={() => {
              setEditingId(null);
              void loadQueue();
            }}
          />
        ) : null}
        {scope === 'BIOLINK' && editingId ? (
          <BiolinkLiveEditor
            biolinkId={editingId}
            routes={{
              item: (id) => `/moderator/item/BIOLINK/${id}`,
              decide: (id) => `/moderator/item/BIOLINK/${id}/decide`,
            }}
            onClose={() => setEditingId(null)}
            onModerated={() => {
              setEditingId(null);
              void loadQueue();
            }}
          />
        ) : null}
        {scope === 'BUSINESS_CARD' && editingId ? (
          <BusinessCardLiveEditor
            businessCardId={editingId}
            routes={{
              item: (id) => `/moderator/item/BUSINESS_CARD/${id}`,
              decide: (id) => `/moderator/item/BUSINESS_CARD/${id}/decide`,
            }}
            onClose={() => setEditingId(null)}
            onModerated={() => {
              setEditingId(null);
              void loadQueue();
            }}
          />
        ) : null}
      </div>
    </ModeratorShell>
  );
}

function ModeratorCard({
  scope,
  item,
  busy,
  editing,
  onApprove,
  onReject,
  onEdit,
}: {
  scope: ModeratorScope;
  item: QueueItem;
  busy: boolean;
  editing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  // News/feed editors render below the card; biolink/business-card editors are
  // full forms, so for those the "edit" button just toggles the editor panel.
  const preview =
    scope === 'FEED'
      ? item.body ?? ''
      : scope === 'NEWS'
        ? item.title ?? ''
        : `${item.fullName ?? ''}${item.jobTitle ? ` — ${item.jobTitle}` : ''}`;
  const owner = item.user?.fullName ?? item.author?.fullName ?? item.user?.email ?? '';
  const tag = item.topic?.name ?? item.category?.name ?? null;

  return (
    <div className="indeed-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">
            {item.title ?? item.fullName ?? 'بدون عنوان'}
          </p>
          {preview && preview !== (item.title ?? item.fullName) ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted">{preview}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted">
            {owner ? `مالک: ${owner}` : ''}
            {tag ? ` • ${tag}` : ''}
          </p>
        </div>
        {item.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.images[0]}
            alt=""
            className="size-16 shrink-0 rounded-lg border border-[var(--vintage-border)] object-cover"
          />
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onApprove}
          disabled={busy}
          className="indeed-btn indeed-btn-primary flex-1 py-2.5 text-sm"
        >
          <Check className="size-4" aria-hidden />
          تأیید
        </button>
        <button
          onClick={onEdit}
          disabled={busy}
          className={cn(
            'indeed-btn flex-1 py-2.5 text-sm',
            editing ? 'indeed-btn-primary' : 'indeed-btn-secondary',
          )}
        >
          <Pencil className="size-4" aria-hidden />
          {editing ? 'بستن ویرایش' : 'ویرایش'}
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          className="indeed-btn flex-1 border-red-300 py-2.5 text-sm text-red-600"
        >
          <X className="size-4" aria-hidden />
          رد
        </button>
      </div>
    </div>
  );
}
