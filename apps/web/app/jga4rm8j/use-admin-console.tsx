'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { AdminColumn } from '@/components/admin/AdminDataTable';
import type { AdminSection } from '@/components/admin/AdminShell';
import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import type { PaginationMeta } from '@/components/ui/Pagination';
import type { AdminTicket, AdminUser } from '@/components/admin/AdminTables';

import {
  EMPTY_STATS,
  isAdminSection,
  type AdminBiolink,
  type AdminBusinessCard,
  type OverviewPayload,
} from './admin-console';

/**
 * All state, data loading and mutations behind the admin console. Keeping them
 * in one hook lets `page.tsx` stay a thin router of panels and lets each panel
 * render from a single typed snapshot.
 */
export function useAdminConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, hydrated } = useAuth();

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [biolinks, setBiolinks] = useState<AdminBiolink[]>([]);
  const [businessCards, setBusinessCards] = useState<AdminBusinessCard[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBusinessCardId, setEditingBusinessCardId] = useState<string | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[] | null>(null);
  const [usersMeta, setUsersMeta] = useState<PaginationMeta | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [allTickets, setAllTickets] = useState<AdminTicket[] | null>(null);
  const [biolinksMeta, setBiolinksMeta] = useState<PaginationMeta | null>(null);
  const [biolinksPage, setBiolinksPage] = useState(1);
  const [cardsMeta, setCardsMeta] = useState<PaginationMeta | null>(null);
  const [cardsPage, setCardsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const data = await api.get<OverviewPayload>('/admin/overview');
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    }
  }, []);

  const loadAllUsers = useCallback(async (page = usersPage) => {
    try {
      const data = await api.get<{ items: AdminUser[]; meta: PaginationMeta }>(
        `/admin/users?page=${page}`,
      );
      setAllUsers(data.items);
      setUsersMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری کاربران');
    }
  }, [usersPage]);

  const loadAllTickets = useCallback(async () => {
    try {
      const data = await api.get<{ items: AdminTicket[] }>('/admin/tickets?limit=50');
      setAllTickets(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تیکت‌ها');
    }
  }, []);

  const loadBiolinks = useCallback(async (page = biolinksPage) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        status,
        page: String(page),
      });
      if (appliedSearch.trim()) query.set('search', appliedSearch.trim());
      const result = await api.get<{ items: AdminBiolink[]; meta: PaginationMeta }>(
        `/admin/biolinks?${query.toString()}`,
      );
      setBiolinks(result.items);
      setBiolinksMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status, biolinksPage, appliedSearch]);

  const loadBusinessCards = useCallback(async (page = cardsPage) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        status,
        page: String(page),
      });
      if (appliedSearch.trim()) query.set('search', appliedSearch.trim());
      const result = await api.get<{ items: AdminBusinessCard[]; meta: PaginationMeta }>(
        `/admin/business-cards?${query.toString()}`,
      );
      setBusinessCards(result.items);
      setCardsMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status, cardsPage, appliedSearch]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user && user.role === 'MODERATOR') {
      router.replace('/moderator');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    void loadOverview();
  }, [hydrated, token, user, router, loadOverview]);

  // The active panel lives ONLY in the URL. Deriving it from `?section=` (with
  // an `overview` fallback for an absent param) means there is a single source
  // of truth, so the "URL -> state" and "state -> URL" effects that used to
  // fight each other are gone. Those effects raced during Next.js client
  // navigations (e.g. clicking a notification in the bell): `searchParams` is
  // briefly empty mid-transition, `overview` was inferred from it, and the
  // stale value was written back — re-firing `router.replace` dozens of times
  // and making the whole panel jump/vibrate between tabs.
  const urlSection =
    searchParams.get('section') && isAdminSection(searchParams.get('section')!)
      ? (searchParams.get('section') as AdminSection)
      : 'overview';

  // Selecting a panel simply navigates; the URL is the state.
  const setSection = useCallback(
    (next: AdminSection) => {
      const target = next === 'overview' ? '/jga4rm8j' : `/jga4rm8j?section=${next}`;
      router.replace(target, { scroll: false });
    },
    [router],
  );

  const section = urlSection;

  useEffect(() => {
    if (section === 'biolinks') {
      void loadBiolinks();
    }
    if (section === 'business-cards') {
      void loadBusinessCards();
    }
    if (section === 'users') {
      void loadAllUsers();
    }
    if (section === 'tickets') {
      void loadAllTickets();
    }
  }, [section, loadBiolinks, loadBusinessCards, loadAllUsers, loadAllTickets]);

  // reset to the first page whenever the status filter changes
  useEffect(() => {
    setBiolinksPage(1);
    setCardsPage(1);
  }, [status, appliedSearch]);

  async function updateTicket(id: string, next: AdminTicket['status']) {
    try {
      await api.patch(`/admin/tickets/${id}`, { status: next });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'به‌روزرسانی تیکت ناموفق بود');
    }
  }

  async function setUserActive(id: string, isActive: boolean, reason?: string) {
    try {
      await api.patch(`/admin/users/${id}/active`, { isActive, reason });
      await loadAllUsers();
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت کاربر ناموفق بود');
    }
  }

  async function setUserComment(id: string, comment: string) {
    try {
      await api.patch(`/admin/users/${id}/comment`, { comment });
      await loadAllUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت کامنت ناموفق بود');
    }
  }

  async function setUserRole(id: string, role: AdminUser['role']) {
    const target = (allUsers ?? overview?.recentUsers ?? []).find((u) => u.id === id);
    const name = target?.fullName ?? target?.email ?? 'این کاربر';
    const roleLabel =
      role === 'ADMIN'
        ? 'مدیر'
        : role === 'MODERATOR'
          ? 'کاربر ادمین'
          : role === 'CITIZEN_REPORTER'
            ? 'شهروند خبرنگار'
            : 'کاربر';
    if (
      !window.confirm(
        `آیا از تغییر نقش «${name}» به «${roleLabel}» مطمئن هستید؟`,
      )
    ) {
      await loadAllUsers();
      return;
    }
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      await loadAllUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر نقش کاربر ناموفق بود');
      await loadAllUsers();
    }
  }

  async function deleteUser(id: string) {
    try {
      await api.delete(`/admin/users/${id}`);
      await loadAllUsers();
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کاربر ناموفق بود');
    }
  }

  async function forceLogoutUser(id: string) {
    if (
      !window.confirm('همه‌ی نشست‌های فعال این کاربر بسته شود؟ او باید دوباره وارد شود.')
    ) {
      return;
    }
    try {
      const result = await api.delete<{ revoked: number }>(`/admin/users/${id}/sessions`);
      toast.success(`از ${result.revoked} نشست خارج شد.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خروج اجباری ناموفق بود');
    }
  }

  const stats = overview?.stats ?? EMPTY_STATS;

  const biolinkColumns: Array<AdminColumn<AdminBiolink>> = [
    {
      key: 'fullName',
      label: 'نام',
      render: (item) => (
        <span className="font-extrabold text-ink">{item.fullName}</span>
      ),
    },
    {
      key: 'job',
      label: 'شغل / شرکت',
      render: (item) => (
        <span className="text-xs text-muted">
          {item.jobTitle ?? '—'} {item.company ? `— ${item.company}` : ''}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'کاربر',
      render: (item) => (
        <span dir="ltr" className="text-xs text-muted">
          {item.user.email}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (item) => <BiolinkStatusBadge status={item.status} />,
    },
    {
      key: 'approver',
      label: 'تأییدکننده',
      render: (item) => (
        <span className="text-xs text-muted">
          {item.decidedBy
            ? item.decidedBy.fullName ?? item.decidedBy.email ?? '—'
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.isPublished ? (
            <a
              href={`/biolinks/${item.slug}`}
              target="_blank"
              rel="noreferrer"
              className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
            >
              مشاهده
            </a>
          ) : null}
          <button
            onClick={() => setEditingId(item.id)}
            className="indeed-btn indeed-btn-primary py-1.5 text-xs"
          >
            بررسی و ویرایش
          </button>
        </div>
      ),
    },
  ];

  const businessCardColumns: Array<AdminColumn<AdminBusinessCard>> = [
    {
      key: 'fullName',
      label: 'نام',
      render: (item) => (
        <span className="font-extrabold text-ink">{item.fullName}</span>
      ),
    },
    {
      key: 'job',
      label: 'شغل / شرکت',
      render: (item) => (
        <span className="text-xs text-muted">
          {item.jobTitle ?? '—'} {item.company ? `— ${item.company}` : ''}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'کاربر',
      render: (item) => (
        <span dir="ltr" className="text-xs text-muted">
          {item.user.email}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      render: (item) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <BusinessCardStatusBadge status={item.status} />
          {item.isClaimedImport ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              تصاحب‌شده از ایمپورت
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'approver',
      label: 'تأییدکننده',
      render: (item) => (
        <span className="text-xs text-muted">
          {item.decidedBy
            ? item.decidedBy.fullName ?? item.decidedBy.email ?? '—'
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.isPublished || item.isUnclaimed ? (
            <a
              href={`/business-cards/${item.slug}`}
              target="_blank"
              rel="noreferrer"
              className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
            >
              مشاهده
            </a>
          ) : null}
          <button
            onClick={() => setEditingBusinessCardId(item.id)}
            className="indeed-btn indeed-btn-primary py-1.5 text-xs"
          >
            بررسی و ویرایش
          </button>
        </div>
      ),
    },
  ];

  return {
    section,
    setSection,
    overview,
    stats,
    error,
    loading,
    status,
    setStatus,
    search,
    setSearch,
    appliedSearch,
    setAppliedSearch,
    biolinks,
    biolinkColumns,
    biolinksMeta,
    setBiolinksPage,
    editingId,
    setEditingId,
    loadBiolinks,
    businessCards,
    businessCardColumns,
    cardsMeta,
    setCardsPage,
    editingBusinessCardId,
    setEditingBusinessCardId,
    loadBusinessCards,
    allUsers,
    usersMeta,
    setUsersPage,
    setUserActive,
    setUserComment,
    setUserRole,
    deleteUser,
    forceLogoutUser,
    loadAllUsers,
    allTickets,
    usersPage,
    loadAllTickets,
    updateTicket,
    loadOverview,
    openTicketId,
    setOpenTicketId,
  };
}

/** Typed snapshot handed to every console panel. */
export type AdminConsole = ReturnType<typeof useAdminConsole>;
