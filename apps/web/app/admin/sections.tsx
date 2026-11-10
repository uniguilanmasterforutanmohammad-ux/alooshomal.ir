'use client';

import { Search } from 'lucide-react';

import { ActivityLogPanel } from '@/components/admin/ActivityLogPanel';
import { AdminAds } from '@/components/admin/AdminAds';
import { AdminAppearanceSettings } from '@/components/admin/AdminAppearanceSettings';
import { AdminAuthSettings } from '@/components/admin/AdminAuthSettings';
import { AdminBiolinkTemplates } from '@/components/admin/AdminBiolinkTemplates';
import { AdminBlogPanel } from '@/components/admin/AdminBlogPanel';
import { AdminBoosts } from '@/components/admin/AdminBoosts';
import { AdminBulkTools } from '@/components/admin/AdminBulkTools';
import { AdminWalletSettings } from '@/components/admin/AdminWalletSettings';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { AdminDirectorySettings } from '@/components/admin/AdminDirectorySettings';
import { AdminEmails } from '@/components/admin/AdminEmails';
import { AdminFeatureFlags } from '@/components/admin/AdminFeatureFlags';
import { AdminFeeds } from '@/components/admin/AdminFeeds';
import { AdminModerators } from '@/components/admin/AdminModerators';
import { AdminMonitoringPanel } from '@/components/admin/AdminMonitoringPanel';
import { AdminNewsPanel } from '@/components/admin/AdminNewsPanel';
import { AdminNewsSettings } from '@/components/admin/AdminNewsSettings';
import { AdminNotificationSettings } from '@/components/admin/AdminNotificationSettings';
import { AdminOnboardingSteps } from '@/components/admin/AdminOnboardingSteps';
import { AdminPaypingOAuthPanel } from '@/components/admin/AdminPaypingOAuthPanel';
import { AdminPaypingPanel } from '@/components/admin/AdminPaypingPanel';
import { AdminPermissionsMatrix } from '@/components/admin/AdminPermissionsMatrix';
import { AdminPoints } from '@/components/admin/AdminPoints';
import { AdminProfileRequests } from '@/components/admin/AdminProfileRequests';
import { AdminRevenue } from '@/components/admin/AdminRevenue';
import { AdminStoragePanel } from '@/components/admin/AdminStoragePanel';
import { AdminSubscriptions } from '@/components/admin/AdminSubscriptions';
import { AdminTicketPanel } from '@/components/admin/AdminTicketPanel';
import {
  EMPTY_SIGNUP_SERIES,
  QuickActions,
  SignupChart,
  StatsGrid,
} from '@/components/admin/AdminOverviewWidgets';
import {
  ReportsTable,
  TicketsTable,
  UsersTable,
} from '@/components/admin/AdminTables';
import { BiolinkLiveEditor } from '@/components/admin/BiolinkLiveEditor';
import { BusinessCardLiveEditor } from '@/components/admin/BusinessCardLiveEditor';
import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { NotificationsInbox } from '@/components/ui/NotificationsInbox';
import { Pagination } from '@/components/ui/Pagination';

import type { AdminConsole } from './use-admin-console';

/* ------------------------------------------------------------------ */
/*  Console panels                                                     */
/*                                                                    */
/*  Each panel renders the JSX that used to be inlined in `page.tsx`;  */
/*  the state/mutations come from `useAdminConsole()` as one typed     */
/*  snapshot so panels stay presentation-only.                         */
/* ------------------------------------------------------------------ */

export function OverviewSection({ state }: { state: AdminConsole }) {
  return (
    <div className="flex flex-col gap-5">
      <StatsGrid stats={state.stats} />

      <QuickActions stats={state.stats} onSection={state.setSection} />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <SignupChart series={state.overview?.signupSeries ?? EMPTY_SIGNUP_SERIES} />
        <div className="indeed-panel p-5">
          <h3 className="text-sm font-extrabold text-ink">خلاصه پلتفرم</h3>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            <li className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2">
              <span className="text-muted">بیولینک‌های تأییدشده</span>
              <b className="text-ink">{state.stats.approved.toLocaleString('fa-IR')}</b>
            </li>
            <li className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2">
              <span className="text-muted">بیولینک‌های ردشده</span>
              <b className="text-ink">{state.stats.rejected.toLocaleString('fa-IR')}</b>
            </li>
            <li className="flex items-center justify-between border-b border-[var(--vintage-border)] pb-2">
              <span className="text-muted">بازدید بیولینک‌ها</span>
              <b className="text-ink">{state.stats.scans.toLocaleString('fa-IR')}</b>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">کل تیکت‌ها</span>
              <b className="text-ink">{state.stats.totalTickets.toLocaleString('fa-IR')}</b>
            </li>
          </ul>
        </div>
      </div>

      <UsersTable
        users={state.overview?.recentUsers ?? []}
        onViewAll={() => state.setSection('users')}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <TicketsTable
          tickets={state.overview?.recentTickets ?? []}
          onStatus={state.updateTicket}
          onOpen={state.setOpenTicketId}
          onViewAll={() => state.setSection('tickets')}
        />
        <ReportsTable
          reports={state.overview?.reports ?? []}
          onViewAll={() => state.setSection('reports')}
        />
      </div>

      {state.openTicketId ? (
        <AdminTicketPanel
          ticketId={state.openTicketId}
          onClose={() => state.setOpenTicketId(null)}
          onUpdated={() => {
            void state.loadOverview();
            if (state.allTickets) void state.loadAllTickets();
          }}
        />
      ) : null}
    </div>
  );
}

export function BiolinksSection({ state }: { state: AdminConsole }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((value) => (
          <button
            key={value}
            onClick={() => state.setStatus(value)}
            className={
              state.status === value
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
            state.setAppliedSearch(state.search);
          }}
          className="ms-auto flex items-center gap-2"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={state.search}
              onChange={(event) => state.setSearch(event.target.value)}
              placeholder="جستجوی نام، شغل، شرکت، ایمیل…"
              className="indeed-input w-64 py-2 pr-9 text-sm"
            />
          </div>
          <button type="submit" className="indeed-btn indeed-btn-secondary py-2 text-sm">
            جستجو
          </button>
          {state.appliedSearch ? (
            <button
              type="button"
              onClick={() => {
                state.setSearch('');
                state.setAppliedSearch('');
              }}
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
            >
              پاک‌کردن
            </button>
          ) : null}
        </form>
      </div>

      {state.loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : (
        <AdminDataTable
          columns={state.biolinkColumns}
          rows={state.biolinks}
          rowKey={(item) => item.id}
          empty="بیولینکی در این وضعیت وجود ندارد."
        />
      )}

      {state.editingId ? (
        <BiolinkLiveEditor
          biolinkId={state.editingId}
          onClose={() => state.setEditingId(null)}
          onModerated={() => {
            state.setEditingId(null);
            void state.loadBiolinks();
            void state.loadOverview();
          }}
        />
      ) : null}
      {state.biolinksMeta ? (
        <Pagination meta={state.biolinksMeta} onPage={state.setBiolinksPage} />
      ) : null}
    </div>
  );
}

export function BusinessCardsSection({ state }: { state: AdminConsole }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((value) => (
          <button
            key={value}
            onClick={() => state.setStatus(value)}
            className={
              state.status === value
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
            state.setAppliedSearch(state.search);
          }}
          className="ms-auto flex items-center gap-2"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={state.search}
              onChange={(event) => state.setSearch(event.target.value)}
              placeholder="جستجوی نام، شغل، شرکت، ایمیل…"
              className="indeed-input w-64 py-2 pr-9 text-sm"
            />
          </div>
          <button type="submit" className="indeed-btn indeed-btn-secondary py-2 text-sm">
            جستجو
          </button>
          {state.appliedSearch ? (
            <button
              type="button"
              onClick={() => {
                state.setSearch('');
                state.setAppliedSearch('');
              }}
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
            >
              پاک‌کردن
            </button>
          ) : null}
        </form>
      </div>

      {state.loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : (
        <AdminDataTable
          columns={state.businessCardColumns}
          rows={state.businessCards}
          rowKey={(item) => item.id}
          empty="کارت ویزیتی در این وضعیت وجود ندارد."
        />
      )}

      {state.editingBusinessCardId ? (
        <BusinessCardLiveEditor
          businessCardId={state.editingBusinessCardId}
          onClose={() => state.setEditingBusinessCardId(null)}
          onModerated={() => {
            state.setEditingBusinessCardId(null);
            void state.loadBusinessCards();
            void state.loadOverview();
          }}
        />
      ) : null}
      {state.cardsMeta ? <Pagination meta={state.cardsMeta} onPage={state.setCardsPage} /> : null}
    </div>
  );
}

export function UsersSection({ state }: { state: AdminConsole }) {
  return (
    <div>
      <AdminProfileRequests />
      <UsersTable
        title="همه کاربران"
        users={state.allUsers ?? state.overview?.recentUsers ?? []}
        onToggleActive={state.setUserActive}
        onDelete={state.deleteUser}
        onComment={state.setUserComment}
        onRole={state.setUserRole}
        onSessions={state.forceLogoutUser}
      />
      {state.usersMeta ? (
        <Pagination meta={state.usersMeta} onPage={state.setUsersPage} />
      ) : null}
    </div>
  );
}

export function TicketsSection({ state }: { state: AdminConsole }) {
  return (
    <div className="flex flex-col gap-4">
      <TicketsTable
        title="همه تیکت‌ها"
        tickets={state.allTickets ?? state.overview?.recentTickets ?? []}
        onStatus={state.updateTicket}
        onOpen={state.setOpenTicketId}
      />
      {state.openTicketId ? (
        <AdminTicketPanel
          ticketId={state.openTicketId}
          onClose={() => state.setOpenTicketId(null)}
          onUpdated={() => {
            void state.loadOverview();
            void state.loadAllTickets();
          }}
        />
      ) : null}
    </div>
  );
}

export function SettingsSection() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminAppearanceSettings />
      <AdminFeatureFlags />
      <AdminOnboardingSteps />
      <AdminBiolinkTemplates />
      <AdminDirectorySettings />
      <AdminAuthSettings />
      <AdminWalletSettings />
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
  );
}
