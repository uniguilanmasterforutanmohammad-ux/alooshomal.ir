'use client';

import { Suspense } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { ActivityLogPanel } from '@/components/admin/ActivityLogPanel';
import { AdminAds } from '@/components/admin/AdminAds';
import { AdminBlogPanel } from '@/components/admin/AdminBlogPanel';
import { AdminBoosts } from '@/components/admin/AdminBoosts';
import { AdminBulkTools } from '@/components/admin/AdminBulkTools';
import { AdminEmails } from '@/components/admin/AdminEmails';
import { AdminFeeds } from '@/components/admin/AdminFeeds';
import { AdminModerators } from '@/components/admin/AdminModerators';
import { AdminMonitoringPanel } from '@/components/admin/AdminMonitoringPanel';
import { AdminNewsPanel } from '@/components/admin/AdminNewsPanel';
import { AdminPaypingOAuthPanel } from '@/components/admin/AdminPaypingOAuthPanel';
import { AdminPaypingPanel } from '@/components/admin/AdminPaypingPanel';
import { AdminPermissionsMatrix } from '@/components/admin/AdminPermissionsMatrix';
import { AdminPoints } from '@/components/admin/AdminPoints';
import { AdminRevenue } from '@/components/admin/AdminRevenue';
import { AdminStoragePanel } from '@/components/admin/AdminStoragePanel';
import { AdminSubscriptions } from '@/components/admin/AdminSubscriptions';
import { NotificationsInbox } from '@/components/ui/NotificationsInbox';

import { PAGE_HEAD } from './admin-console';
import {
  BiolinksSection,
  BusinessCardsSection,
  OverviewSection,
  SettingsSection,
  TicketsSection,
  UsersSection,
} from './sections';
import { useAdminConsole } from './use-admin-console';

/**
 * Thin router of the admin console: the URL (`?section=`) is the single source
 * of truth, `useAdminConsole()` owns the data, and each panel lives in
 * `sections.tsx`.
 */
function AdminContent() {
  const state = useAdminConsole();
  const { section } = state;

  return (
    <AdminShell section={section} onSection={state.setSection}>
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-ink">
          {PAGE_HEAD[section].title}
        </h2>
        <p className="text-sm text-muted">{PAGE_HEAD[section].sub}</p>
      </div>

      {state.error ? (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {section === 'overview' ? <OverviewSection state={state} /> : null}
      {section === 'biolinks' ? <BiolinksSection state={state} /> : null}
      {section === 'business-cards' ? (
        <BusinessCardsSection state={state} />
      ) : null}
      {section === 'users' ? <UsersSection state={state} /> : null}
      {section === 'emails' ? <AdminEmails /> : null}
      {section === 'subscriptions' ? <AdminSubscriptions /> : null}
      {section === 'boosts' ? <AdminBoosts /> : null}
      {section === 'ads' ? <AdminAds /> : null}
      {section === 'points' ? <AdminPoints /> : null}
      {section === 'revenue' ? <AdminRevenue /> : null}
      {section === 'payments' ? <AdminPaypingPanel /> : null}
      {section === 'payping-oauth' ? <AdminPaypingOAuthPanel /> : null}
      {section === 'feeds' ? <AdminFeeds /> : null}
      {section === 'tickets' ? <TicketsSection state={state} /> : null}
      {section === 'reports' ? <ActivityLogPanel /> : null}
      {section === 'news' ? <AdminNewsPanel /> : null}
      {section === 'blog' ? <AdminBlogPanel /> : null}
      {section === 'permissions' ? <AdminPermissionsMatrix /> : null}
      {section === 'moderators' ? <AdminModerators /> : null}
      {section === 'storage' ? <AdminStoragePanel /> : null}
      {section === 'monitoring' ? <AdminMonitoringPanel /> : null}
      {section === 'notifications' ? <NotificationsInbox scope="admin" /> : null}
      {section === 'tools' ? <AdminBulkTools /> : null}
      {section === 'settings' ? <SettingsSection /> : null}
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
