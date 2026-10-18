'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Plus, Search } from 'lucide-react';

import { AdminShell, type AdminSection } from '@/components/admin/AdminShell';
import { AdminTicketPanel } from '@/components/admin/AdminTicketPanel';
import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { AdminDirectorySettings } from '@/components/admin/AdminDirectorySettings';
import { AdminAuthSettings } from '@/components/admin/AdminAuthSettings';
import { AdminSubscriptions } from '@/components/admin/AdminSubscriptions';
import { AdminBoosts } from '@/components/admin/AdminBoosts';
import { AdminAds } from '@/components/admin/AdminAds';
import { AdminPoints } from '@/components/admin/AdminPoints';
import { AdminRevenue } from '@/components/admin/AdminRevenue';
import { AdminFeeds } from '@/components/admin/AdminFeeds';
import { AdminNotificationSettings } from '@/components/admin/AdminNotificationSettings';
import { NotificationsInbox } from '@/components/ui/NotificationsInbox';
import { AdminNewsPanel } from '@/components/admin/AdminNewsPanel';
import { AdminProfileRequests } from '@/components/admin/AdminProfileRequests';
import { AdminPermissionsMatrix } from '@/components/admin/AdminPermissionsMatrix';
import { AdminModerators } from '@/components/admin/AdminModerators';
import { AdminNewsSettings } from '@/components/admin/AdminNewsSettings';
import { AdminStoragePanel } from '@/components/admin/AdminStoragePanel';
import { ActivityLogPanel } from '@/components/admin/ActivityLogPanel';
import { AdminBulkTools } from '@/components/admin/AdminBulkTools';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { BiolinkLiveEditor } from '@/components/admin/BiolinkLiveEditor';
import { BusinessCardLiveEditor } from '@/components/admin/BusinessCardLiveEditor';
import {
  SignupChart,
  StatsGrid,
  type OverviewStats,
} from '@/components/admin/AdminOverviewWidgets';
import {
  ReportsTable,
  TicketsTable,
  UsersTable,
  type AdminReport,
  type AdminTicket,
  type AdminUser,
} from '@/components/admin/AdminTables';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import {
  Pagination,
  type PaginationMeta,
} from '@/components/ui/Pagination';

interface AdminBiolink {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  status: string;
  isPublished: boolean;
  user: { email: string; fullName: string | null };
  decidedBy?: { id: string; fullName: string | null; email: string | null } | null;
}

type AdminBusinessCard = AdminBiolink;

interface OverviewPayload {
  stats: OverviewStats;
  recentUsers: AdminUser[];
  recentTickets: AdminTicket[];
  reports: AdminReport[];
  signups: number[];
}

const EMPTY_STATS: OverviewStats = {
  pending: 0,
  approved: 0,
  rejected: 0,
  published: 0,
  users: 0,
  scans: 0,
  openTickets: 0,
  totalTickets: 0,
  recentUsers: 0,
};

const ADMIN_SECTIONS: AdminSection[] = [
  'overview',
  'biolinks',
  'business-cards',
  'subscriptions',
  'boosts',
  'ads',
  'points',
  'revenue',
  'feeds',
  'users',
  'tickets',
  'news',
  'permissions',
  'moderators',
  'storage',
  'reports',
  'tools',
  'notifications',
  'settings',
];

function isAdminSection(value: string): value is AdminSection {
  return (ADMIN_SECTIONS as string[]).includes(value);
}

function AdminContent() {
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
      const target = next === 'overview' ? '/admin' : `/admin?section=${next}`;
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
      render: (item) => <BusinessCardStatusBadge status={item.status} />,
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

  const pageHead: Record<AdminSection, { title: string; sub: string }> = {
    overview: { title: 'داشبورد مدیریت', sub: 'نمای کلی پلتفرم شما در یک نگاه' },
    biolinks: { title: 'بررسی بیولینک‌ها', sub: 'تأیید، رد و ویرایش بیولینک‌ها' },
    'business-cards': {
      title: 'بررسی کارت‌های ویزیت',
      sub: 'تأیید، رد و ویرایش کارت‌های ویزیت',
    },
    subscriptions: { title: 'اشتراک‌ها', sub: 'مدیریت بسته‌ها و تأیید درخواست کاربران' },
    boosts: { title: 'افزایش بازدید', sub: 'بررسی و تأیید درخواست‌های پله' },
    ads: { title: 'تبلیغات', sub: 'تأیید درخواست‌های تبلیغ و تنظیمات نمایش' },
    points: { title: 'امتیازها', sub: 'مدیریت جوایز، امتیاز هر خبر و دریافت‌ها' },
    revenue: {
      title: 'گزارش درآمد',
      sub: 'برآورد درآمد هر مدل درآمدی و تعیین قیمت واحد',
    },
    feeds: { title: 'فیدها', sub: 'بررسی پست‌ها، اشتراک‌ها، بسته‌ها و تنظیمات' },
    users: { title: 'کاربران', sub: 'لیست کاربران پلتفرم' },
    tickets: { title: 'تیکت‌ها', sub: 'مدیریت تیکت‌های پشتیبانی' },
    news: {
      title: 'نبض شهر',
      sub: 'بررسی خبرهای شهروند خبرنگارها، درخواست‌ها و دسته‌بندی‌ها',
    },
    permissions: {
      title: 'سطوح دسترسی',
      sub: 'تعیین دسترسی هر نقش به امکانات پلتفرم',
    },
    moderators: {
      title: 'کاربران ادمین محدود',
      sub: 'ساخت حساب کاربر ادمین با تعیین سطح دسترسی برای بررسی محتوا',
    },
    storage: {
      title: 'فضای سرور',
      sub: 'حجم آپلودهای رسانه، ریشه‌ی باکت و فضای هارد دیسک سرور',
    },
    reports: { title: 'گزارش‌ها', sub: 'گزارش‌های سیستم' },
    tools: { title: 'ابزار تست', sub: 'ایمپورت گروهی، حذف داده‌های تستی و قفل ساخت' },
    notifications: {
      title: 'اعلانات',
      sub: 'تاریخچه‌ی کامل اعلانات مدیران',
    },
    settings: { title: 'تنظیمات', sub: 'شهرها، کسب‌وکارها و نمایش دایرکتوری' },
  };

  return (
    <AdminShell section={section} onSection={setSection}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">{pageHead[section].title}</h2>
          <p className="text-sm text-muted">{pageHead[section].sub}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="indeed-btn indeed-btn-secondary py-2 text-sm">
            <Download className="size-4" aria-hidden />
            دانلود گزارش
          </button>
          <button className="indeed-btn indeed-btn-primary py-2 text-sm">
            <Plus className="size-4" aria-hidden />
            کاربر جدید
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {section === 'overview' ? (
        <div className="flex flex-col gap-5">
          <StatsGrid stats={stats} />

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <SignupChart data={overview?.signups ?? new Array(12).fill(0)} />
            <div className="indeed-panel p-5">
              <h3 className="text-sm font-extrabold text-ink">خلاصه پلتفرم</h3>
              <ul className="mt-3 flex flex-col gap-3 text-sm">
                <li className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2">
                  <span className="text-muted">بیولینک‌های تأییدشده</span>
                  <b className="text-ink">{stats.approved.toLocaleString('fa-IR')}</b>
                </li>
                <li className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2">
                  <span className="text-muted">بیولینک‌های ردشده</span>
                  <b className="text-ink">{stats.rejected.toLocaleString('fa-IR')}</b>
                </li>
                <li className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2">
                  <span className="text-muted">بازدید بیولینک‌ها</span>
                  <b className="text-ink">{stats.scans.toLocaleString('fa-IR')}</b>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted">کل تیکت‌ها</span>
                  <b className="text-ink">{stats.totalTickets.toLocaleString('fa-IR')}</b>
                </li>
              </ul>
            </div>
          </div>

          <UsersTable
            users={overview?.recentUsers ?? []}
            onViewAll={() => setSection('users')}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            <TicketsTable
              tickets={overview?.recentTickets ?? []}
              onStatus={updateTicket}
              onOpen={setOpenTicketId}
              onViewAll={() => setSection('tickets')}
            />
            <ReportsTable
              reports={overview?.reports ?? []}
              onViewAll={() => setSection('reports')}
            />
          </div>

          {openTicketId ? (
            <AdminTicketPanel
              ticketId={openTicketId}
              onClose={() => setOpenTicketId(null)}
              onUpdated={() => {
                void loadOverview();
                if (allTickets) void loadAllTickets();
              }}
            />
          ) : null}
        </div>
      ) : null}

      {section === 'biolinks' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={
                  status === value
                    ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                    : 'indeed-btn indeed-btn-secondary py-2 text-sm'
                }
              >
                {value === 'PENDING'
                  ? 'در انتظار'
                  : value === 'APPROVED'
                    ? 'تأییدشده'
                    : 'ردشده'}
              </button>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(search);
              }}
              className="ms-auto flex items-center gap-2"
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="جستجوی نام، شغل، شرکت، ایمیل…"
                  className="indeed-input w-64 py-2 pr-9 text-sm"
                />
              </div>
              <button type="submit" className="indeed-btn indeed-btn-secondary py-2 text-sm">
                جستجو
              </button>
              {appliedSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setAppliedSearch('');
                  }}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  پاک‌کردن
                </button>
              ) : null}
            </form>
          </div>

          {loading ? (
            <p className="text-muted">در حال بارگذاری...</p>
          ) : (
            <AdminDataTable
              columns={biolinkColumns}
              rows={biolinks}
              rowKey={(item) => item.id}
              empty="بیولینکی در این وضعیت وجود ندارد."
            />
          )}

          {editingId ? (
            <BiolinkLiveEditor
              biolinkId={editingId}
              onClose={() => setEditingId(null)}
              onModerated={() => {
                setEditingId(null);
                void loadBiolinks();
                void loadOverview();
              }}
            />
          ) : null}
          {biolinksMeta ? (
            <Pagination meta={biolinksMeta} onPage={setBiolinksPage} />
          ) : null}
        </div>
      ) : null}

      {section === 'business-cards' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={
                  status === value
                    ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                    : 'indeed-btn indeed-btn-secondary py-2 text-sm'
                }
              >
                {value === 'PENDING'
                  ? 'در انتظار'
                  : value === 'APPROVED'
                    ? 'تأییدشده'
                    : 'ردشده'}
              </button>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(search);
              }}
              className="ms-auto flex items-center gap-2"
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="جستجوی نام، شغل، شرکت، ایمیل…"
                  className="indeed-input w-64 py-2 pr-9 text-sm"
                />
              </div>
              <button type="submit" className="indeed-btn indeed-btn-secondary py-2 text-sm">
                جستجو
              </button>
              {appliedSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setAppliedSearch('');
                  }}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  پاک‌کردن
                </button>
              ) : null}
            </form>
          </div>

          {loading ? (
            <p className="text-muted">در حال بارگذاری...</p>
          ) : (
            <AdminDataTable
              columns={businessCardColumns}
              rows={businessCards}
              rowKey={(item) => item.id}
              empty="کارت ویزیتی در این وضعیت وجود ندارد."
            />
          )}

          {editingBusinessCardId ? (
            <BusinessCardLiveEditor
              businessCardId={editingBusinessCardId}
              onClose={() => setEditingBusinessCardId(null)}
              onModerated={() => {
                setEditingBusinessCardId(null);
                void loadBusinessCards();
                void loadOverview();
              }}
            />
          ) : null}
          {cardsMeta ? <Pagination meta={cardsMeta} onPage={setCardsPage} /> : null}
        </div>
      ) : null}

      {section === 'users' ? (
        <div>
          <AdminProfileRequests />
          <UsersTable
            title="همه کاربران"
            users={allUsers ?? overview?.recentUsers ?? []}
            onToggleActive={setUserActive}
            onDelete={deleteUser}
            onComment={setUserComment}
            onRole={setUserRole}
            onSessions={forceLogoutUser}
          />
          {usersMeta ? (
            <Pagination meta={usersMeta} onPage={setUsersPage} />
          ) : null}
        </div>
      ) : null}

      {section === 'subscriptions' ? <AdminSubscriptions /> : null}

      {section === 'boosts' ? <AdminBoosts /> : null}

      {section === 'ads' ? <AdminAds /> : null}

      {section === 'points' ? <AdminPoints /> : null}

      {section === 'revenue' ? <AdminRevenue /> : null}

      {section === 'feeds' ? <AdminFeeds /> : null}

      {section === 'tickets' ? (
        <div className="flex flex-col gap-4">
          <TicketsTable
            title="همه تیکت‌ها"
            tickets={allTickets ?? overview?.recentTickets ?? []}
            onStatus={updateTicket}
            onOpen={setOpenTicketId}
          />
          {openTicketId ? (
            <AdminTicketPanel
              ticketId={openTicketId}
              onClose={() => setOpenTicketId(null)}
              onUpdated={() => {
                void loadOverview();
                void loadAllTickets();
              }}
            />
          ) : null}
        </div>
      ) : null}

      {section === 'reports' ? <ActivityLogPanel /> : null}

      {section === 'news' ? <AdminNewsPanel /> : null}

      {section === 'permissions' ? <AdminPermissionsMatrix /> : null}

      {section === 'moderators' ? <AdminModerators /> : null}

      {section === 'storage' ? <AdminStoragePanel /> : null}

      {section === 'notifications' ? <NotificationsInbox scope="admin" /> : null}

      {section === 'tools' ? <AdminBulkTools /> : null}

      {section === 'settings' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminDirectorySettings />
          <AdminAuthSettings />
          <AdminNotificationSettings />
          <AdminNewsSettings />
          <TaxonomyManager
            title="مدیریت شهرها"
            description="شهرهای قابل انتخاب در فرم ساخت بیولینک"
            endpoint="/admin/cities"
            placeholder="نام شهر"
          />
          <TaxonomyManager
            title="مدیریت کسب‌وکارها"
            description="دسته‌بندی‌های کسب‌وکار قابل انتخاب"
            endpoint="/admin/businesses"
            placeholder="نام کسب‌وکار"
          />
        </div>
      ) : null}
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-muted">در حال بارگذاری...</div>}
    >
      <AdminContent />
    </Suspense>
  );
}
