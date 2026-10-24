'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, Pencil, Search, Sparkles, X } from 'lucide-react';

import { ModeratorShell, type ModeratorScopeTab } from './ModeratorShell';
import { BiolinkLiveEditor } from '@/components/admin/BiolinkLiveEditor';
import { BusinessCardLiveEditor } from '@/components/admin/BusinessCardLiveEditor';
import { AdminNewsEditor } from '@/components/admin/AdminNewsEditor';
import { ModeratorFeedEditor } from './ModeratorFeedEditor';
import {
  api,
  type ModeratorMe,
  type ModeratorQueuePage,
  type ModeratorScope,
  type NewsStatus,
} from '@/lib/api';
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
  requestedAt?: string;
  jobTitle?: string | null;
  company?: string | null;
  kind?: string;
  note?: string | null;
  adminNote?: string | null;
  placement?: string;
  plan?: { name: string } | null;
  user?: { email?: string | null; fullName?: string | null } | null;
  author?: { email?: string | null; fullName?: string | null } | null;
  decidedBy?: { fullName?: string | null; email?: string | null } | null;
  topic?: { name: string } | null;
  category?: { name: string } | null;
  target?: { id: string; fullName: string; slug: string } | null;
}

type TabStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_TABS: Array<{ value: TabStatus; label: string }> = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'APPROVED', label: 'تأییدشده' },
  { value: 'REJECTED', label: 'ردشده' },
];

const CONTENT_SCOPES: ModeratorScope[] = ['BIOLINK', 'BUSINESS_CARD', 'FEED', 'NEWS'];

const SCOPE_LABELS: Record<ModeratorScope, string> = {
  BIOLINK: 'بیولینک‌ها',
  BUSINESS_CARD: 'کارت‌های ویزیت',
  FEED: 'فیدها',
  NEWS: 'شهروند خبرنگار',
  SUBSCRIPTION_REQUESTS: 'اشتراک‌ها',
  AD_REQUESTS: 'تبلیغ صفحه اصلی',
  DIRECTORY_AD_REQUESTS: 'تبلیغ دایرکتوری',
  BOOST_REQUESTS: 'پله',
};

/**
 * The limited «کاربر ادمین» review panel: pick a granted scope, browse its
 * queue on a phone/tablet with infinite scroll (10 per page), see per-status
 * summary numbers, then approve, edit or reject each item inline. The
 * «تأییدشده / ردشده» tabs only list what *this* reviewer decided.
 */
export function ModeratorPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, hydrated } = useAuth();

  const [me, setMe] = useState<ModeratorMe | null>(null);
  const [status, setStatus] = useState<TabStatus>('PENDING');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const refreshMe = useCallback(() => {
    api
      .get<ModeratorMe>('/moderator/me')
      .then(setMe)
      .catch(() => undefined);
  }, []);

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

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!scope) return;
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const data = await api.get<ModeratorQueuePage<QueueItem>>(
          `/moderator/queue/${scope}?status=${status}&page=${targetPage}`,
        );
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasNext(data.hasNext);
        setPage(data.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری صف');
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [scope, status],
  );

  // Reset to page 1 whenever the scope or status tab changes.
  useEffect(() => {
    if (scope) void loadPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, status]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNext || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPage(page + 1, true);
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNext, loading, loadingMore, page, loadPage]);

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
      refreshMe();
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
      pending: me.counts[value]?.pending ?? 0,
    })) ?? [];

  const counts = scope ? me?.counts[scope] : undefined;

  const filtered = query.trim()
    ? items.filter((item) => {
        const haystack = `${item.fullName ?? ''} ${item.title ?? ''} ${
          item.body ?? ''
        } ${item.plan?.name ?? ''} ${item.target?.fullName ?? ''} ${
          item.user?.fullName ?? item.author?.fullName ?? ''
        }`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      })
    : items;

  return (
    <ModeratorShell
      tabs={tabs}
      active={scope ?? ''}
      onTab={(s) => setScope(s as ModeratorScope)}
    >
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

        <div className="grid grid-cols-3 gap-2">
          {STATUS_TABS.map((tab) => {
            const value =
              tab.value === 'PENDING'
                ? counts?.pending ?? 0
                : tab.value === 'APPROVED'
                  ? counts?.approved ?? 0
                  : counts?.rejected ?? 0;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setEditingId(null);
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition',
                  status === tab.value
                    ? 'border-brand bg-brand-light text-brand'
                    : 'border-[var(--vintage-border)] bg-white text-muted',
                )}
              >
                <span className="text-lg font-extrabold text-ink">
                  {value.toLocaleString('fa-IR')}
                </span>
                <span className="text-[11px] font-bold">{tab.label}</span>
              </button>
            );
          })}
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
                  status={status}
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

        {hasNext ? (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore ? <Loader2 className="size-5 animate-spin text-muted" /> : null}
          </div>
        ) : null}

        {scope === 'FEED' && editingId ? (
          <ModeratorFeedEditor
            feedPostId={editingId}
            onClose={() => setEditingId(null)}
            onChanged={() => {
              setEditingId(null);
              void loadPage(1, false);
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
              void loadPage(1, false);
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
              void loadPage(1, false);
              refreshMe();
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
              void loadPage(1, false);
              refreshMe();
            }}
          />
        ) : null}
      </div>
    </ModeratorShell>
  );
}

const REQUEST_KIND_LABEL: Record<string, string> = {
  BIOLINK: 'بیولینک',
  BUSINESS_CARD: 'کارت ویزیت',
  FEED: 'پست فید',
};

function ModeratorCard({
  scope,
  item,
  status,
  busy,
  editing,
  onApprove,
  onReject,
  onEdit,
}: {
  scope: ModeratorScope;
  item: QueueItem;
  status: TabStatus;
  busy: boolean;
  editing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  const isRequest = !CONTENT_SCOPES.includes(scope);
  const isDecisionView = status !== 'PENDING';

  const title = isRequest
    ? item.plan?.name ?? item.target?.fullName ?? item.kind ?? 'درخواست'
    : item.title ?? item.fullName ?? 'بدون عنوان';

  const preview = isRequest
    ? item.note ?? null
    : scope === 'FEED'
      ? item.body ?? ''
      : scope === 'NEWS'
        ? item.title ?? ''
        : `${item.fullName ?? ''}${item.jobTitle ? ` — ${item.jobTitle}` : ''}`;

  const owner =
    item.user?.fullName ?? item.author?.fullName ?? item.user?.email ?? '';
  const tag = item.topic?.name ?? item.category?.name ?? null;

  return (
    <div className="indeed-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">
            {title}
            {isRequest && item.kind ? (
              <span className="ms-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {REQUEST_KIND_LABEL[item.kind] ?? item.kind}
              </span>
            ) : null}
          </p>
          {preview && preview !== title ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted">{preview}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted">
            {owner ? `متقاضی: ${owner}` : ''}
            {tag ? ` • ${tag}` : ''}
          </p>
          {isDecisionView && item.decidedBy ? (
            <p className="mt-1 text-[11px] text-emerald-700">
              بررسی‌کننده: {item.decidedBy.fullName ?? item.decidedBy.email ?? '—'}
            </p>
          ) : null}
          {isDecisionView && item.adminNote ? (
            <p className="mt-0.5 text-[11px] text-muted">یادداشت: {item.adminNote}</p>
          ) : null}
        </div>
        {!isRequest && item.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.images[0]}
            alt=""
            className="size-16 shrink-0 rounded-lg border border-[var(--vintage-border)] object-cover"
          />
        ) : isRequest ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Sparkles className="size-5" aria-hidden />
          </span>
        ) : null}
      </div>

      {isDecisionView ? null : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className="indeed-btn indeed-btn-primary flex-1 py-2.5 text-sm"
          >
            <Check className="size-4" aria-hidden />
            تأیید
          </button>
          {isRequest ? null : (
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
          )}
          <button
            onClick={onReject}
            disabled={busy}
            className="indeed-btn flex-1 border-red-300 py-2.5 text-sm text-red-600"
          >
            <X className="size-4" aria-hidden />
            رد
          </button>
        </div>
      )}
    </div>
  );
}
