'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Plus } from 'lucide-react';

import { AdminShell, type AdminSection } from '@/components/admin/AdminShell';
import { AdminTicketPanel } from '@/components/admin/AdminTicketPanel';
import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { AdminDirectorySettings } from '@/components/admin/AdminDirectorySettings';
import { AdminSubscriptions } from '@/components/admin/AdminSubscriptions';
import { AdminBoosts } from '@/components/admin/AdminBoosts';
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
  'users',
  'tickets',
  'reports',
  'settings',
];

function isAdminSection(value: string): value is AdminSection {
  return (ADMIN_SECTIONS as string[]).includes(value);
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, hydrated } = useAuth();

  const [section, setSection] = useState<AdminSection>(() => {
    const requested = searchParams.get('section');
    return requested && isAdminSection(requested)
      ? (requested as AdminSection)
      : 'overview';
  });
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [biolinks, setBiolinks] = useState<AdminBiolink[]>([]);
  const [businessCards, setBusinessCards] = useState<AdminBusinessCard[]>([]);
  const [status, setStatus] = useState('PENDING');
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
      const result = await api.get<{ items: AdminBiolink[]; meta: PaginationMeta }>(
        `/admin/biolinks?status=${status}&page=${page}`,
      );
      setBiolinks(result.items);
      setBiolinksMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status, biolinksPage]);

  const loadBusinessCards = useCallback(async (page = cardsPage) => {
    setLoading(true);
    try {
      const result = await api.get<{ items: AdminBusinessCard[]; meta: PaginationMeta }>(
        `/admin/business-cards?status=${status}&page=${page}`,
      );
      setBusinessCards(result.items);
      setCardsMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [status, cardsPage]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    void loadOverview();
  }, [hydrated, token, user, router, loadOverview]);

  // Keep the URL (`?section=`) in sync with the active tab, and let admin
  // notifications deep-link straight to the right panel.
  //
  // This is done with a single effect on purpose: two effects that mirror
  // `section` <-> `?section=` fight each other (the `overview` case maps to an
  // ABSENT param), which re-fired `router.replace` on every render and made the
  // page jump/vibrate between panels.
  const urlSection =
    searchParams.get('section') && isAdminSection(searchParams.get('section')!)
      ? (searchParams.get('section') as AdminSection)
      : 'overview';

  // URL -> state: react to back/forward and deep links.
  useEffect(() => {
    setSection(urlSection);
  }, [urlSection]);

  // State -> URL: only rewrite when the URL is actually out of sync, so this
  // settles after a single `replace` instead of looping.
  useEffect(() => {
    if (urlSection === section) return;
    const target = section === 'overview' ? '/admin' : `/admin?section=${section}`;
    router.replace(target, { scroll: false });
  }, [section, urlSection, router]);

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
  }, [status]);

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

  async function deleteUser(id: string) {
    try {
      await api.delete(`/admin/users/${id}`);
      await loadAllUsers();
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کاربر ناموفق بود');
    }
  }

  const stats = overview?.stats ?? EMPTY_STATS;

  const pageHead: Record<AdminSection, { title: string; sub: string }> = {
    overview: { title: 'داشبورد مدیریت', sub: 'نمای کلی پلتفرم شما در یک نگاه' },
    biolinks: { title: 'بررسی بیولینک‌ها', sub: 'تأیید، رد و ویرایش بیولینک‌ها' },
    'business-cards': {
      title: 'بررسی کارت‌های ویزیت',
      sub: 'تأیید، رد و ویرایش کارت‌های ویزیت',
    },
    subscriptions: { title: 'اشتراک‌ها', sub: 'مدیریت بسته‌ها و تأیید درخواست کاربران' },
    boosts: { title: 'افزایش بازدید', sub: 'بررسی و تأیید درخواست‌های پله' },
    users: { title: 'کاربران', sub: 'لیست کاربران پلتفرم' },
    tickets: { title: 'تیکت‌ها', sub: 'مدیریت تیکت‌های پشتیبانی' },
    reports: { title: 'گزارش‌ها', sub: 'گزارش‌های سیستم' },
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
          <div className="flex flex-wrap gap-2">
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
          </div>

          {loading ? (
            <p className="text-muted">در حال بارگذاری...</p>
          ) : biolinks.length === 0 ? (
            <div className="indeed-panel p-8 text-center text-muted">
              بیولینکی در این وضعیت وجود ندارد.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {biolinks.map((biolink) => (
                <div
                  key={biolink.id}
                  className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-extrabold text-ink">{biolink.fullName}</h3>
                      <BiolinkStatusBadge status={biolink.status} />
                    </div>
                    <p className="text-sm text-muted">
                      {biolink.jobTitle ?? '—'} {biolink.company ? `— ${biolink.company}` : ''}
                    </p>
                    <p dir="ltr" className="text-xs text-muted">
                      {biolink.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {biolink.isPublished ? (
                      <a
                        href={`/biolinks/${biolink.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="indeed-btn indeed-btn-secondary py-2 text-sm"
                      >
                        مشاهده
                      </a>
                    ) : null}
                    <button
                      onClick={() => setEditingId(biolink.id)}
                      className="indeed-btn indeed-btn-primary py-2 text-sm"
                    >
                      بررسی و ویرایش
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="flex flex-wrap gap-2">
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
          </div>

          {loading ? (
            <p className="text-muted">در حال بارگذاری...</p>
          ) : businessCards.length === 0 ? (
            <div className="indeed-panel p-8 text-center text-muted">
              کارت ویزیتی در این وضعیت وجود ندارد.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {businessCards.map((businessCard) => (
                <div
                  key={businessCard.id}
                  className="indeed-panel flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-extrabold text-ink">
                        {businessCard.fullName}
                      </h3>
                      <BusinessCardStatusBadge status={businessCard.status} />
                    </div>
                    <p className="text-sm text-muted">
                      {businessCard.jobTitle ?? '—'}{' '}
                      {businessCard.company ? `— ${businessCard.company}` : ''}
                    </p>
                    <p dir="ltr" className="text-xs text-muted">
                      {businessCard.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {businessCard.isPublished ? (
                      <a
                        href={`/business-cards/${businessCard.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="indeed-btn indeed-btn-secondary py-2 text-sm"
                      >
                        مشاهده
                      </a>
                    ) : null}
                    <button
                      onClick={() => setEditingBusinessCardId(businessCard.id)}
                      className="indeed-btn indeed-btn-primary py-2 text-sm"
                    >
                      بررسی و ویرایش
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
          <UsersTable
            title="همه کاربران"
            users={allUsers ?? overview?.recentUsers ?? []}
            onToggleActive={setUserActive}
            onDelete={deleteUser}
            onComment={setUserComment}
          />
          {usersMeta ? (
            <Pagination meta={usersMeta} onPage={setUsersPage} />
          ) : null}
        </div>
      ) : null}

      {section === 'subscriptions' ? <AdminSubscriptions /> : null}

      {section === 'boosts' ? <AdminBoosts /> : null}

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

      {section === 'reports' ? <ReportsTable reports={overview?.reports ?? []} /> : null}

      {section === 'settings' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminDirectorySettings />
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
