'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Coins,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  UserCheck,
  Wallet,
} from 'lucide-react';

import { api } from '@/lib/api';
import type { FinanceInvoice } from '@/lib/api/types/finance';
import { printInvoiceDocument } from '@/lib/invoice-print';
import { cn } from '@/lib/utils';

interface Counts {
  biolinks: number;
  businessCards: number;
  feedPosts: number;
  tickets: number;
  notifications: number;
  sessions: number;
  identityInquiryLogs: number;
  invoices: number;
}

interface UserDocument {
  id?: string;
  name?: string;
  url?: string;
  size?: number;
  contentType?: string;
  uploadedAt?: string;
}

interface DetailUser {
  id: string;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  nationalCode: string | null;
  birthDate: string | null;
  phoneMatchVerifiedAt: string | null;
  identityVerifiedAt: string | null;
  businessLicenseVerifiedAt: string | null;
  businessLicenseData: Record<string, unknown> | null;
  verifiedAt: string | null;
  blueTickRequestedAt: string | null;
  blueTickNote: string | null;
  documents: UserDocument[] | null;
  role: string;
  isActive: boolean;
  moderatorScopes: string[];
  deactivatedReason: string | null;
  deactivatedAt: string | null;
  adminComment: string | null;
  planId: string | null;
  planExpiresAt: string | null;
  pointsBalance: number;
  createdAt: string;
  updatedAt: string;
  plan: {
    id: string;
    name: string;
    price: number;
    maxBiolinks: number;
    maxBusinessCards: number;
  } | null;
  _count: Counts;
}

interface CityRef {
  id: string;
  name: string;
}

interface BusinessRef {
  id: string;
  name: string;
}

interface ContentLinks {
  website?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface Biolink extends ContentLinks {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  city: CityRef | null;
  business: BusinessRef | null;
  status: string;
  isPublished: boolean;
  avatarUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
  _count: { scanEvents: number; likes: number; saves: number };
}

interface BusinessCard extends ContentLinks {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  city: CityRef | null;
  business: BusinessRef | null;
  status: string;
  isPublished: boolean;
  avatarUrl: string | null;
  logoUrl: string | null;
  gallery: string[];
  createdAt: string;
  _count: { scans: number; likes: number; saves: number; reviews: number };
}

interface FeedPost {
  id: string;
  body: string | null;
  images: string[];
  topic: { id: string; name: string } | null;
  status: string;
  isPublished: boolean;
  createdAt: string;
  _count: { likes: number; comments: number; saves: number };
}

interface DecisionUser {
  id: string;
  fullName: string | null;
  email: string | null;
}

interface PaymentBase {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

interface UserSubscription {
  id: string;
  status: string;
  months: number;
  requestedAt: string;
  startsAt: string | null;
  expiresAt: string | null;
  note: string | null;
  adminNote: string | null;
  plan: { id: string; name: string; price: number };
  decidedBy: DecisionUser | null;
  payment: PaymentBase | null;
}

interface FeedSubscription {
  id: string;
  status: string;
  requestedAt: string;
  startedAt: string | null;
  expiresAt: string | null;
  postsUsed: number;
  note: string | null;
  adminNote: string | null;
  package: {
    id: string;
    name: string;
    postsQuota: number;
    durationDays: number;
  };
  decidedBy: DecisionUser | null;
}

interface SubscriptionPayment extends PaymentBase {
  months: number;
  refId?: string | null;
  paymentCode?: string | null;
  clientRefId?: string;
  businessAmount?: number;
  identityAmount?: number;
  moduleAmount?: number;
  withBusinessPackage?: boolean;
  businessPackages?: Array<{
    workspaceId?: string;
    packageKey?: string;
    label?: string;
    amount?: number;
    months?: number;
  }> | null;
  moduleItems?: Array<{
    stepId?: string;
    moduleKey?: string;
    type?: string;
    label?: string;
    amount?: number;
  }> | null;
  plan: { id: string; name: string; price: number };
}

interface WalletEntry {
  id: string;
  kind: string;
  amount: number;
  title: string;
  sourceType: string | null;
  createdAt: string;
}

interface UserWallet {
  id: string;
  nationalCode: string | null;
  balance: number;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries: WalletEntry[];
}

interface GatewayPayment extends PaymentBase {
  clientRefId?: string;
  refId?: string | null;
  paymentCode?: string | null;
  serviceKey?: string;
  title?: string | null;
  nationalCode?: string | null;
  withLicense?: boolean;
  consumedAt?: string | null;
  items?:
    | Array<{
        serviceKey?: string;
        label?: string;
        amount?: number;
      }>
    | {
        modules?: Array<{
          serviceKey?: string;
          label?: string;
          amount?: number;
        }>;
      }
    | null;
}

interface RequestPayment extends PaymentBase {
  target: string;
  refId?: string | null;
  paymentCode?: string | null;
  clientRefId?: string;
  boostRequest: {
    id: string;
    kind: string;
    targetId: string;
    feature: string;
    status: string;
  } | null;
  adRequest: {
    id: string;
    kind: string;
    targetId: string;
    placement: string;
    status: string;
  } | null;
}

interface BoostRequest {
  id: string;
  kind: string;
  targetId: string;
  feature: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
  adminNote: string | null;
  decidedBy: DecisionUser | null;
  payment: PaymentBase | null;
}

interface AdRequest {
  id: string;
  kind: string;
  targetId: string;
  placement: string;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  note: string | null;
  adminNote: string | null;
  decidedBy: DecisionUser | null;
  payment: PaymentBase | null;
}

interface IdentityInquiry {
  id: string;
  kind: string;
  status: string;
  nationalCode: string | null;
  birthDate: string | null;
  phone: string | null;
  matched: boolean | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  message: string | null;
  amount: number;
  raw: unknown;
  createdAt: string;
}

interface PointsEntry {
  id: string;
  delta: number;
  reason: string;
  entityType: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface Invoice {
  id: string;
  number: string;
  title: string;
  status: string;
  total: number;
  issuedAt: string;
  paidAt: string | null;
  sourceType?: string;
  sourceId?: string | null;
  items: Array<{ id: string; description: string; total: number }>;
}

interface ProfileChangeRequest {
  id: string;
  changes: unknown;
  status: string;
  reason: string | null;
  createdAt: string;
}

interface BusinessReview {
  id: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: string;
  businessCard: { id: string; fullName: string; slug: string };
}

interface RewardRedemption {
  id: string;
  pointsSpent: number;
  detail: string | null;
  createdAt: string;
  reward: { id: string; title: string; kind: string };
}

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  actor: DecisionUser | null;
}

interface SessionRow {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface SupportConversation {
  id: string;
  status: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  userUnread: number;
  staffUnread: number;
  createdAt: string;
  _count: { messages: number };
}

interface ActivityLogRow {
  id: string;
  action: string;
  summary: string;
  actorEmail: string | null;
  actorRole: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

interface SentEmailRow {
  id: string;
  to: string;
  subject: string;
  purpose: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

interface ClaimRequestRow {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  businessCard: { id: string; fullName: string; slug: string; status: string };
  decidedBy: DecisionUser | null;
}

interface MediaItem {
  key: string;
  url: string;
  folder: string;
  label: string;
  size: number;
  lastModified: string | null;
}

interface UserDetailPayload {
  user: DetailUser;
  biolinks: Biolink[];
  businessCards: BusinessCard[];
  posts: FeedPost[];
  subscriptions: UserSubscription[];
  feedSubscriptions: FeedSubscription[];
  subscriptionPayments: SubscriptionPayment[];
  wallet: UserWallet | null;
  walletPayments: GatewayPayment[];
  servicePayments: GatewayPayment[];
  requestPayments: RequestPayment[];
  boosts: BoostRequest[];
  ads: AdRequest[];
  identityInquiries: IdentityInquiry[];
  pointsLedger: PointsEntry[];
  tickets: Ticket[];
  invoices: Invoice[];
  profileChangeRequests: ProfileChangeRequest[];
  reviews: BusinessReview[];
  rewardRedemptions: RewardRedemption[];
  onboardingCompletions: Array<{ id: string; stepId: string; completedAt: string }>;
  notifications: NotificationRow[];
  sessions: SessionRow[];
  supportConversations: SupportConversation[];
  activityLogs: ActivityLogRow[];
  sentEmails: SentEmailRow[];
  claimRequests: ClaimRequestRow[];
  media: MediaItem[];
  mediaSummary: {
    count: number;
    bytes: number;
    folders: Array<{ folder: string; label: string; count: number; bytes: number }>;
  };
}

const ROLE_LABELS: Record<string, string> = {
  USER: 'کاربر',
  CITIZEN_REPORTER: 'شهروند خبرنگار',
  MODERATOR: 'کاربر ادمین',
  ADMIN: 'مدیر',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  ACTIVE: 'فعال',
  CANCELLED: 'لغوشده',
  PAID: 'پرداخت‌شده',
  FAILED: 'ناموفق',
  CANCELED: 'لغوشده',
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  CLOSED: 'بسته',
  SUCCESS: 'موفق',
  CACHED: 'از کش',
  SENT: 'ارسال‌شده',
  ISSUED: 'صادرشده',
  VOID: 'باطل',
  UNPUBLISHED: 'منتشرنشده',
  DRAFT: 'پیش‌نویس',
  LOW: 'کم',
  NORMAL: 'عادی',
  HIGH: 'زیاد',
};

const KIND_LABELS: Record<string, string> = {
  BIOLINK: 'بیولینک',
  BUSINESS_CARD: 'کارت ویزیت',
  FEED: 'پست',
  PHONE_MATCH: 'تطبیق موبایل',
  IDENTITY_INQUIRY: 'استعلام هویتی',
  BUSINESS_LICENSE: 'استعلام جواز کسب',
  SUBSCRIPTION: 'اشتراک',
  BOOST: 'افزایش بازدید',
  AD_HOME: 'تبلیغ صفحه اصلی',
  AD_DIRECTORY: 'تبلیغ دایرکتوری',
  FEED_TAG: 'تگ پست',
  FEED_PACKAGE: 'بسته پست',
  ADJUSTMENT: 'تعدیل دستی',
  PAYMENT: 'پرداخت',
  POLE: 'پله',
  HOME: 'صفحه اصلی',
  DIRECTORY: 'دایرکتوری',
  SUBSCRIPTION_REWARD: 'جایزه اشتراک',
  USER: 'کاربر',
  TICKET: 'تیکت',
};

function faNumber(value: number): string {
  return value.toLocaleString('fa-IR');
}

function faDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fa-IR');
}

function faDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function toman(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${faNumber(value)} تومان`;
}

function bytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '۰';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  const amount = value / Math.pow(1024, exponent);
  return `${(exponent === 0 ? amount : Math.round(amount * 10) / 10).toLocaleString('fa-IR')} ${units[exponent]}`;
}

function statusLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return STATUS_LABELS[value] ?? value;
}

function kindLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return KIND_LABELS[value] ?? value;
}

interface UnifiedPaymentRow {
  id: string;
  kind: string;
  title: string;
  /** Purchased cart items / modules shown under the title. */
  items: string[];
  /** Extra audit details (national code, license, plan term, …). */
  details: string[];
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  refId: string | null;
  paymentCode: string | null;
  clientRefId: string | null;
  failureReason: string | null;
  invoiceId: string | null;
}

/** Merge every gateway transaction of a user into one chronological feed. */
function buildUnifiedPayments(data: UserDetailPayload): UnifiedPaymentRow[] {
  const rows: UnifiedPaymentRow[] = [];
  const invoiceBySource = new Map<string, string>();
  for (const invoice of data.invoices) {
    if (invoice.sourceType && invoice.sourceId) {
      invoiceBySource.set(
        `${invoice.sourceType}:${invoice.sourceId}`,
        invoice.id,
      );
    }
  }
  const invoiceFor = (sourceType: string, sourceId: string) =>
    invoiceBySource.get(`${sourceType}:${sourceId}`) ?? null;

  for (const row of data.subscriptionPayments) {
    const items: string[] = [];
    const details: string[] = [`${row.months} ماه`];
    if (row.businessAmount && row.businessAmount > 0) {
      const labels = (row.businessPackages ?? [])
        .map((item) => item.label)
        .filter((label): label is string => Boolean(label));
      items.push(
        labels.length > 0
          ? `بسته مدیریت: ${labels.join('، ')}`
          : 'بسته مدیریت کسب‌وکار',
      );
    }
    if (row.identityAmount && row.identityAmount > 0) {
      items.push('استعلام هویت');
    }
    const moduleLabels = (row.moduleItems ?? [])
      .map((item) => item.label)
      .filter((label): label is string => Boolean(label));
    if (moduleLabels.length > 0) {
      items.push(...moduleLabels);
    }
    rows.push({
      id: row.id,
      kind: 'اشتراک',
      title: `${row.plan.name} — ${row.months} ماه`,
      items,
      details,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
      refId: row.refId ?? null,
      paymentCode: row.paymentCode ?? null,
      clientRefId: row.clientRefId ?? null,
      failureReason: row.failureReason,
      invoiceId: invoiceFor('SUBSCRIPTION_PAYMENT', row.id),
    });
  }
  for (const row of data.servicePayments) {
    const title = row.title?.trim() || row.serviceKey || 'استعلام خدمت';
    const rawItems = row.items;
    const modules = Array.isArray(rawItems)
      ? rawItems
      : Array.isArray(rawItems?.modules)
        ? rawItems.modules
        : [];
    const items = modules
      .map((item) => item.label)
      .filter((label): label is string => Boolean(label));
    const details: string[] = [];
    if (row.nationalCode) details.push(`کد ملی: ${row.nationalCode}`);
    if (row.withLicense) details.push('شامل جواز کسب');
    rows.push({
      id: row.id,
      kind: 'استعلام/خدمت',
      title,
      items,
      details,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
      refId: row.refId ?? null,
      paymentCode: row.paymentCode ?? null,
      clientRefId: row.clientRefId ?? null,
      failureReason: row.failureReason,
      invoiceId: invoiceFor('SERVICE_PAYMENT', row.id),
    });
  }
  for (const row of data.walletPayments) {
    const details: string[] = [];
    if (row.nationalCode) details.push(`کد ملی: ${row.nationalCode}`);
    rows.push({
      id: row.id,
      kind: 'کیف پول',
      title: 'تسویه بدهی کیف پول',
      items: [],
      details,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
      refId: row.refId ?? null,
      paymentCode: row.paymentCode ?? null,
      clientRefId: row.clientRefId ?? null,
      failureReason: row.failureReason,
      invoiceId: invoiceFor('WALLET_PAYMENT', row.id),
    });
  }
  for (const row of data.requestPayments) {
    const details: string[] = [];
    if (row.boostRequest) {
      details.push(`پله: ${row.boostRequest.feature}`);
      details.push(`وضعیت: ${row.boostRequest.status}`);
    }
    if (row.adRequest) {
      details.push(`جایگاه: ${row.adRequest.placement}`);
      details.push(`وضعیت: ${row.adRequest.status}`);
    }
    const sourceType =
      row.target === 'BOOST'
        ? 'BOOST_PAYMENT'
        : row.target === 'AD_HOME'
          ? 'AD_HOME_PAYMENT'
          : 'AD_DIRECTORY_PAYMENT';
    rows.push({
      id: row.id,
      kind: 'پله/تبلیغ',
      title: kindLabel(row.target),
      items: [],
      details,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
      refId: row.refId ?? null,
      paymentCode: row.paymentCode ?? null,
      clientRefId: row.clientRefId ?? null,
      failureReason: row.failureReason,
      invoiceId: invoiceFor(sourceType, row.id),
    });
  }
  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

function fileName(key: string): string {
  return key.split('/').pop() ?? key;
}

function statusClass(value: string): string {
  if (
    ['APPROVED', 'ACTIVE', 'PAID', 'SUCCESS', 'ISSUED', 'CACHED', 'SENT'].includes(value)
  ) {
    return 'badge-open';
  }
  if (['REJECTED', 'FAILED', 'CANCELED', 'CANCELLED', 'VOID'].includes(value)) {
    return 'badge-closed';
  }
  return 'badge-progress';
}

function StatusPill({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-xs text-muted">—</span>;
  return (
    <span
      className={cn(
        'inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold',
        statusClass(value),
      )}
    >
      {statusLabel(value)}
    </span>
  );
}

function Field({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--vintage-border)] bg-white/60 px-3 py-2">
      <dt className="text-[11px] font-bold text-muted">{label}</dt>
      <dd
        className={cn('mt-0.5 break-words text-sm font-semibold text-ink', ltr && 'text-left')}
        dir={ltr ? 'ltr' : undefined}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="indeed-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-sm font-extrabold text-ink">
            {title}
            {count !== undefined ? (
              <span className="ms-2 rounded-md bg-soft px-2 py-0.5 text-[11px] text-muted">
                {faNumber(count)}
              </span>
            ) : null}
          </h3>
          {subtitle ? <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p> : null}
        </div>
      </header>
      <div className="p-3 sm:p-5">{children}</div>
    </section>
  );
}

function DataTable({
  head,
  empty,
  children,
}: {
  head: string[];
  empty: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children;
  const isEmpty = Array.isArray(rows) ? rows.length === 0 : !rows;
  if (isEmpty) {
    return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-right text-sm">
        <thead>
          <tr className="bg-[var(--vintage-surface)] text-xs text-muted">
            {head.map((label) => (
              <th key={label} className="whitespace-nowrap px-3 py-2 font-bold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center text-sm text-muted">{children}</p>;
}

function LinkChip({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1 text-[11px] font-bold text-brand hover:bg-soft"
    >
      {icon}
      {label}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function ContentLinkList({ item }: { item: ContentLinks }) {
  const links: Array<{ href: string; label: string }> = [];
  if (item.website) links.push({ href: item.website, label: 'وب‌سایت' });
  if (item.instagram) links.push({ href: item.instagram, label: 'اینستاگرام' });
  if (item.telegram) links.push({ href: item.telegram, label: 'تلگرام' });
  if (item.twitter) links.push({ href: item.twitter, label: 'توییتر' });
  if (item.whatsapp) links.push({ href: item.whatsapp, label: 'واتساپ' });
  if (item.linkedin) links.push({ href: item.linkedin, label: 'لینکدین' });
  if (links.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map((link) => (
        <LinkChip key={`${link.label}-${link.href}`} href={link.href} label={link.label} />
      ))}
    </div>
  );
}

function ContentCard({
  title,
  slugHref,
  status,
  isPublished,
  image,
  meta,
  bio,
  links,
  stats,
}: {
  title: string;
  slugHref: string;
  status: string;
  isPublished: boolean;
  image?: string | null;
  meta?: React.ReactNode;
  bio?: string | null;
  links?: ContentLinks;
  stats?: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--vintage-border)] bg-white p-3">
      <div className="flex items-start gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="size-14 shrink-0 rounded-lg border border-[var(--vintage-border)] object-cover"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-soft text-muted">
            <ImageIcon className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-extrabold text-ink">{title}</h4>
            <StatusPill value={status} />
            {isPublished ? (
              <span className="text-[11px] font-bold text-emerald-600">منتشرشده</span>
            ) : (
              <span className="text-[11px] font-bold text-muted">منتشرنشده</span>
            )}
          </div>
          {meta ? <div className="mt-1 text-xs text-muted">{meta}</div> : null}
          {bio ? (
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-muted">{bio}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LinkChip href={slugHref} label="صفحه عمومی" />
            {stats ? <span className="text-[11px] text-muted">{stats}</span> : null}
          </div>
          {links ? <ContentLinkList item={links} /> : null}
        </div>
      </div>
    </article>
  );
}

/**
 * 360° admin view of one user, opened from the «کاربران» table. Everything is
 * grouped into readable panels (profile, content, media, money, activity) and
 * every table scrolls horizontally on phones instead of overflowing the page.
 */
export function AdminUserDetail({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<UserDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const payload = await api.get<UserDetailPayload>(
          `/admin/users/${userId}/detail`,
        );
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری اطلاعات کاربر');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  function refresh() {
    setLoading(true);
    setRefreshKey((value) => value + 1);
  }

  /** Fetch the archived invoice and open its print/PDF view. */
  async function downloadInvoice(invoiceId: string) {
    setInvoiceBusy(invoiceId);
    setError(null);
    try {
      const invoice = await api.get<FinanceInvoice>(
        `/admin/finance/invoices/${invoiceId}`,
      );
      if (!printInvoiceDocument(invoice)) {
        setError(
          'مرورگر پنجره‌ی چاپ را مسدود کرد؛ اجازه‌ی بازشدن پنجره را بدهید.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت فاکتور ناموفق بود');
    } finally {
      setInvoiceBusy(null);
    }
  }

  if (loading && !data) {
    return <p className="p-8 text-center text-muted">در حال بارگذاری اطلاعات کاربر...</p>;
  }

  if (!data) {
    return (
      <div className="indeed-panel p-6">
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        <button type="button" onClick={onClose} className="indeed-btn indeed-btn-secondary mt-4">
          بازگشت به لیست
        </button>
      </div>
    );
  }

  const { user } = data;
  const documents = Array.isArray(user.documents) ? user.documents : [];
  const avatar =
    data.media.find((item) => item.folder === 'avatars')?.url ??
    data.biolinks[0]?.avatarUrl ??
    data.businessCards[0]?.avatarUrl ??
    null;
  const mediaGroups = data.mediaSummary.folders.map((group) => ({
    ...group,
    items: data.media.filter((item) => item.folder === group.folder),
  }));
  const contentImages = [
    ...new Set(
      [
        ...data.biolinks.flatMap((item) => [item.avatarUrl, item.logoUrl]),
        ...data.businessCards.flatMap((item) => [
          item.avatarUrl,
          item.logoUrl,
          ...item.gallery,
        ]),
        ...data.posts.flatMap((item) => item.images),
      ].filter((url): url is string => typeof url === 'string' && isImageUrl(url)),
    ),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="indeed-btn indeed-btn-secondary py-2 text-sm"
        >
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به لیست کاربران
        </button>
        <button
          type="button"
          onClick={refresh}
          className="indeed-btn indeed-btn-secondary py-2 text-sm"
          disabled={loading}
        >
          {loading ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی اطلاعات'}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="size-20 rounded-2xl border border-[var(--vintage-border)] object-cover"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-2xl bg-soft text-2xl font-extrabold text-muted">
              {(user.fullName ?? user.email ?? '؟').slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-ink">
                {user.fullName ?? 'بدون نام'}
              </h2>
              <StatusPill value={user.isActive ? 'ACTIVE' : 'REJECTED'} />
              {user.verifiedAt ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                  <ShieldCheck className="size-3" aria-hidden />
                  تیک آبی
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted">
              {ROLE_LABELS[user.role] ?? user.role} · عضویت از {faDate(user.createdAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
              {user.email ? (
                <span dir="ltr" className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" aria-hidden />
                  {user.email}
                </span>
              ) : null}
              {user.phone ? (
                <span dir="ltr" className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" aria-hidden />
                  {user.phone}
                </span>
              ) : null}
              {user.plan ? (
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="size-3.5" aria-hidden />
                  پلن {user.plan.name}
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-2">
            <div className="rounded-lg bg-soft px-4 py-2">
              <p className="text-[11px] text-muted">امتیاز</p>
              <b className="text-sm text-ink">{faNumber(user.pointsBalance)}</b>
            </div>
            <div className="rounded-lg bg-soft px-4 py-2">
              <p className="text-[11px] text-muted">کیف پول</p>
              <b
                className={cn(
                  'text-sm',
                  (data.wallet?.balance ?? 0) < 0 ? 'text-red-600' : 'text-ink',
                )}
              >
                {toman(data.wallet?.balance ?? 0)}
              </b>
            </div>
          </div>
        </div>

        {user.deactivatedReason || user.adminComment ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {user.deactivatedReason ? (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                علت غیرفعال‌سازی: {user.deactivatedReason}
              </p>
            ) : null}
            {user.adminComment ? (
              <p className="rounded-lg bg-soft p-3 text-xs text-muted">
                یادداشت مدیر: {user.adminComment}
              </p>
            ) : null}
          </div>
        ) : null}

        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="ایمیل" value={user.email ?? '—'} ltr />
          <Field label="موبایل" value={user.phone ?? '—'} ltr />
          <Field label="کد ملی" value={user.nationalCode ?? '—'} ltr />
          <Field label="نام" value={user.firstName ?? '—'} />
          <Field label="نام خانوادگی" value={user.lastName ?? '—'} />
          <Field label="نام پدر" value={user.fatherName ?? '—'} />
          <Field label="تاریخ تولد" value={user.birthDate ?? '—'} ltr />
          <Field label="نقش" value={ROLE_LABELS[user.role] ?? user.role} />
          <Field
            label="وضعیت هویت"
            value={
              user.identityVerifiedAt
                ? `تأییدشده — ${faDate(user.identityVerifiedAt)}`
                : 'استعلام نشده'
            }
          />
          <Field
            label="تیک آبی (جواز کسب)"
            value={
              user.businessLicenseVerifiedAt
                ? `تأییدشده — ${faDate(user.businessLicenseVerifiedAt)}`
                : user.businessLicenseData
                  ? 'استعلام شده — مالک جواز مطابقت ندارد'
                  : 'استعلام نشده'
            }
          />
          <Field
            label="تطبیق موبایل"
            value={user.phoneMatchVerifiedAt ? faDate(user.phoneMatchVerifiedAt) : '—'}
          />
          <Field label="پایان اشتراک" value={faDate(user.planExpiresAt)} />
          <Field label="آخرین به‌روزرسانی" value={faDateTime(user.updatedAt)} />
          {user.moderatorScopes.length > 0 ? (
            <Field label="دسترسی‌های ادمین" value={user.moderatorScopes.join('، ')} />
          ) : null}
          {user.blueTickNote ? <Field label="یادداشت تیک آبی" value={user.blueTickNote} /> : null}
        </dl>

        {user.businessLicenseData ? (
          <details className="mt-4 rounded-lg border border-[var(--vintage-border)] bg-soft p-3">
            <summary className="cursor-pointer text-xs font-bold text-ink">
              پاسخ کامل استعلام جواز کسب
            </summary>
            <pre
              dir="ltr"
              className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-muted"
            >
              {JSON.stringify(user.businessLicenseData, null, 2)}
            </pre>
          </details>
        ) : null}

        {documents.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-muted">مدارک ثبت‌شده</p>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <a
                  key={doc.id ?? `${doc.url ?? 'doc'}-${index}`}
                  href={doc.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1 text-xs font-bold text-brand hover:bg-soft"
                >
                  <FileText className="size-3.5" aria-hidden />
                  {doc.name ?? `مدرک ${faNumber(index + 1)}`}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'بیولینک', value: user._count.biolinks, icon: UserCheck },
          { label: 'کارت ویزیت', value: user._count.businessCards, icon: MapPin },
          { label: 'پست', value: user._count.feedPosts, icon: Calendar },
          { label: 'رسانه', value: data.mediaSummary.count, icon: ImageIcon },
          { label: 'تیکت', value: user._count.tickets, icon: Receipt },
          { label: 'اعلان', value: user._count.notifications, icon: Coins },
        ].map((item) => (
          <div key={item.label} className="indeed-panel p-3">
            <item.icon className="size-4 text-brand" aria-hidden />
            <p className="mt-2 text-[11px] text-muted">{item.label}</p>
            <b className="text-lg text-ink">{faNumber(item.value)}</b>
          </div>
        ))}
      </div>

      <Section title="اشتراک و پلن" count={data.subscriptions.length}>
        <DataTable
          head={['پلن', 'دوره', 'وضعیت', 'شروع', 'پایان', 'پرداخت', 'تصمیم‌گیرنده', 'یادداشت']}
          empty="اشتراکی ثبت نشده است."
        >
          {data.subscriptions.map((row) => (
            <tr key={row.id} className="border-t border-[var(--vintage-border)]">
              <td className="px-3 py-2 font-semibold text-ink">{row.plan.name}</td>
              <td className="px-3 py-2 text-xs text-muted">{faNumber(row.months)} ماه</td>
              <td className="px-3 py-2"><StatusPill value={row.status} /></td>
              <td className="px-3 py-2 text-xs text-muted">{faDate(row.startsAt)}</td>
              <td className="px-3 py-2 text-xs text-muted">{faDate(row.expiresAt)}</td>
              <td className="px-3 py-2 text-xs text-muted">
                {row.payment ? `${toman(row.payment.amount)} — ${statusLabel(row.payment.status)}` : '—'}
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {row.decidedBy?.fullName ?? row.decidedBy?.email ?? '—'}
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {row.adminNote ?? row.note ?? '—'}
              </td>
            </tr>
          ))}
        </DataTable>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-extrabold text-ink">بسته‌های پست</h4>
          <DataTable
            head={['بسته', 'سهمیه', 'استفاده‌شده', 'وضعیت', 'شروع', 'پایان']}
            empty="بسته‌ای ثبت نشده است."
          >
            {data.feedSubscriptions.map((row) => (
              <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                <td className="px-3 py-2 font-semibold text-ink">{row.package.name}</td>
                <td className="px-3 py-2 text-xs text-muted">
                  {faNumber(row.package.postsQuota)}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{faNumber(row.postsUsed)}</td>
                <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                <td className="px-3 py-2 text-xs text-muted">{faDate(row.startedAt)}</td>
                <td className="px-3 py-2 text-xs text-muted">{faDate(row.expiresAt)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Section>

      <Section
        title="بیولینک‌ها"
        count={user._count.biolinks}
        subtitle={
          data.biolinks.length < user._count.biolinks
            ? `نمایش ${faNumber(data.biolinks.length)} مورد نخست از ${faNumber(user._count.biolinks)} بیولینک`
            : 'لینک‌ها، اطلاعات تماس و آمار بازدید هر بیولینک'
        }
      >
        {data.biolinks.length === 0 ? (
          <EmptyLine>بیولینکی ثبت نشده است.</EmptyLine>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {data.biolinks.map((item) => (
              <ContentCard
                key={item.id}
                title={item.fullName}
                slugHref={`/biolinks/${item.slug}`}
                status={item.status}
                isPublished={item.isPublished}
                image={item.avatarUrl ?? item.logoUrl}
                meta={
                  <>
                    {item.jobTitle ?? '—'}
                    {item.company ? ` · ${item.company}` : ''}
                    {item.city ? ` · ${item.city.name}` : ''}
                    {item.business ? ` · ${item.business.name}` : ''}
                    {item.mobile ? (
                      <span dir="ltr" className="ms-2 inline-block">
                        {item.mobile}
                      </span>
                    ) : null}
                  </>
                }
                bio={item.bio}
                links={item}
                stats={`${faNumber(item._count.scanEvents)} بازدید · ${faNumber(item._count.likes)} لایک · ${faNumber(item._count.saves)} ذخیره`}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="کارت‌های ویزیت"
        count={user._count.businessCards}
        subtitle={
          data.businessCards.length < user._count.businessCards
            ? `نمایش ${faNumber(data.businessCards.length)} مورد نخست از ${faNumber(user._count.businessCards)} کارت`
            : 'اطلاعات کسب‌وکار، گالری و لینک‌های هر کارت'
        }
      >
        {data.businessCards.length === 0 ? (
          <EmptyLine>کارت ویزیتی ثبت نشده است.</EmptyLine>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {data.businessCards.map((item) => (
              <ContentCard
                key={item.id}
                title={item.fullName}
                slugHref={`/business-cards/${item.slug}`}
                status={item.status}
                isPublished={item.isPublished}
                image={item.logoUrl ?? item.avatarUrl ?? item.gallery[0] ?? null}
                meta={
                  <>
                    {item.jobTitle ?? '—'}
                    {item.company ? ` · ${item.company}` : ''}
                    {item.city ? ` · ${item.city.name}` : ''}
                    {item.business ? ` · ${item.business.name}` : ''}
                    {item.mobile ? (
                      <span dir="ltr" className="ms-2 inline-block">
                        {item.mobile}
                      </span>
                    ) : null}
                  </>
                }
                bio={item.bio}
                links={item}
                stats={`${faNumber(item._count.scans)} بازدید · ${faNumber(item._count.likes)} لایک · ${faNumber(item._count.saves)} ذخیره · ${faNumber(item._count.reviews)} نظر`}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="پست‌ها"
        count={user._count.feedPosts}
        subtitle={
          data.posts.length < user._count.feedPosts
            ? `نمایش ${faNumber(data.posts.length)} مورد نخست از ${faNumber(user._count.feedPosts)} پست`
            : undefined
        }
      >
        {data.posts.length === 0 ? (
          <EmptyLine>پستی ثبت نشده است.</EmptyLine>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.posts.map((post) => (
              <article
                key={post.id}
                className="rounded-xl border border-[var(--vintage-border)] bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusPill value={post.status} />
                  <span className="text-[11px] text-muted">{faDateTime(post.createdAt)}</span>
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-ink">
                  {post.body ?? '—'}
                </p>
                {post.images.length > 0 ? (
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {post.images.slice(0, 6).map((image) => (
                      <a
                        key={image}
                        href={image}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt=""
                          className="aspect-square w-full rounded-md border border-[var(--vintage-border)] object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-[11px] text-muted">
                  {post.topic?.name ?? 'بدون موضوع'} · {faNumber(post._count.likes)} لایک ·{' '}
                  {faNumber(post._count.comments)} کامنت · {faNumber(post._count.saves)} ذخیره
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="تصاویر محتوا"
        count={contentImages.length}
        subtitle="تصاویر پروفایل، لوگو، گالری کارت‌ها و تصاویر پست‌ها"
      >
        {contentImages.length === 0 ? (
          <EmptyLine>تصویری در محتوای این کاربر ثبت نشده است.</EmptyLine>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {contentImages.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border border-[var(--vintage-border)] bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="رسانه‌های آپلودشده"
        count={data.mediaSummary.count}
        subtitle={`حجم کل: ${bytes(data.mediaSummary.bytes)}`}
      >
        {mediaGroups.length === 0 ? (
          <EmptyLine>رسانه‌ای برای این کاربر در فضای ذخیره‌سازی پیدا نشد.</EmptyLine>
        ) : (
          <div className="flex flex-col gap-5">
            {mediaGroups.map((group) => (
              <div key={group.folder}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-extrabold text-ink">{group.label}</h4>
                  <span className="text-[11px] text-muted">
                    {faNumber(group.count)} فایل · {bytes(group.bytes)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {group.items.map((item) => (
                    <a
                      key={item.key}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`${fileName(item.key)} — ${bytes(item.size)}`}
                      className="group overflow-hidden rounded-lg border border-[var(--vintage-border)] bg-white"
                    >
                      {isImageUrl(item.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={fileName(item.key)}
                          className="aspect-square w-full object-cover transition group-hover:opacity-80"
                        />
                      ) : (
                        <span className="flex aspect-square items-center justify-center bg-soft text-muted">
                          <FileText className="size-6" aria-hidden />
                        </span>
                      )}
                      <span className="block truncate px-1.5 py-1 text-[10px] text-muted">
                        {fileName(item.key)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="کیف پول و واریزی‌ها" subtitle="گردش حساب، پرداخت‌های درگاه و فاکتورها">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-3">
            <p className="text-[11px] text-muted">موجودی کیف پول</p>
            <b
              className={cn(
                'text-base',
                (data.wallet?.balance ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700',
              )}
            >
              {toman(data.wallet?.balance ?? 0)}
            </b>
            <p className="mt-1 text-[10px] text-muted">
              سررسید: {faDate(data.wallet?.dueAt)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-3">
            <p className="text-[11px] text-muted">واریزهای کیف پول</p>
            <b className="text-base text-ink">{faNumber(data.walletPayments.length)}</b>
            <p className="mt-1 text-[10px] text-muted">
              موفق:{' '}
              {faNumber(data.walletPayments.filter((item) => item.status === 'PAID').length)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-3">
            <p className="text-[11px] text-muted">فاکتورها</p>
            <b className="text-base text-ink">{faNumber(data.invoices.length)}</b>
            <p className="mt-1 text-[10px] text-muted">
              جمع: {toman(data.invoices.reduce((sum, item) => sum + item.total, 0))}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-extrabold text-ink">
            واریزی‌ها و پرداخت‌های کاربر (همه‌ی تراکنش‌ها)
          </h4>
          <DataTable
            head={[
              'نوع',
              'شرح و اقلام خریداری‌شده',
              'مبلغ',
              'وضعیت',
              'تاریخ پرداخت',
              'کد رهگیری',
              'فاکتور',
            ]}
            empty="تراکنشی ثبت نشده است."
          >
            {buildUnifiedPayments(data).map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="border-t border-[var(--vintage-border)]">
                <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-muted">
                  {row.kind}
                </td>
                <td className="px-3 py-2 align-top text-xs">
                  <span className="block font-semibold text-ink">{row.title}</span>
                  {row.items.length > 0 ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {row.items.map((item, index) => (
                        <span
                          key={`${row.id}-item-${index}`}
                          className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand"
                        >
                          {item}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  {row.details.length > 0 ? (
                    <span className="mt-1 block text-[10px] leading-5 text-muted">
                      {row.details.join(' · ')}
                    </span>
                  ) : null}
                  {row.failureReason ? (
                    <span className="mt-0.5 block text-[10px] font-normal text-red-600">
                      {row.failureReason}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top text-xs font-bold text-ink">
                  {toman(row.amount)}
                </td>
                <td className="px-3 py-2 align-top">
                  <StatusPill value={row.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-muted">
                  {faDateTime(row.paidAt ?? row.createdAt)}
                </td>
                <td
                  dir="ltr"
                  className="px-3 py-2 align-top text-right text-[11px] text-muted"
                >
                  <span className="block">{row.refId ?? '—'}</span>
                  {row.paymentCode ? (
                    <span className="block text-[10px]">
                      کد پرداخت: {row.paymentCode}
                    </span>
                  ) : null}
                  {row.clientRefId ? (
                    <span className="block max-w-[12rem] truncate text-[10px]" title={row.clientRefId}>
                      {row.clientRefId}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top">
                  {row.invoiceId ? (
                    <button
                      type="button"
                      onClick={() => void downloadInvoice(row.invoiceId!)}
                      disabled={invoiceBusy === row.invoiceId}
                      className="indeed-btn indeed-btn-secondary flex items-center gap-1 py-1 text-[10px] disabled:opacity-60"
                    >
                      {invoiceBusy === row.invoiceId ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <Download className="size-3" aria-hidden />
                      )}
                      دانلود
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 flex items-center gap-1 text-xs font-extrabold text-ink">
            <Wallet className="size-4" aria-hidden />
            گردش کیف پول
          </h4>
          <DataTable head={['عنوان', 'نوع', 'مبلغ', 'تاریخ']} empty="گردشی ثبت نشده است.">
            {(data.wallet?.entries ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-[var(--vintage-border)]">
                <td className="px-3 py-2 text-xs font-semibold text-ink">{entry.title}</td>
                <td className="px-3 py-2 text-xs text-muted">{kindLabel(entry.kind)}</td>
                <td
                  className={cn(
                    'px-3 py-2 text-xs font-bold',
                    entry.amount < 0 ? 'text-red-600' : 'text-emerald-700',
                  )}
                >
                  {toman(entry.amount)}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{faDateTime(entry.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-extrabold text-ink">فاکتورها</h4>
          <DataTable
            head={[
              'شماره',
              'عنوان',
              'مبلغ',
              'وضعیت',
              'تاریخ صدور',
              'پرداخت',
              'دانلود',
            ]}
            empty="فاکتوری صادر نشده است."
          >
            {data.invoices.map((row) => (
              <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                <td dir="ltr" className="px-3 py-2 text-right text-xs text-muted">
                  {row.number}
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-ink">{row.title}</td>
                <td className="px-3 py-2 text-xs text-muted">{toman(row.total)}</td>
                <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                <td className="px-3 py-2 text-xs text-muted">{faDate(row.issuedAt)}</td>
                <td className="px-3 py-2 text-xs text-muted">{faDate(row.paidAt)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void downloadInvoice(row.id)}
                    disabled={invoiceBusy === row.id}
                    className="indeed-btn indeed-btn-secondary flex items-center gap-1 py-1 text-[10px] disabled:opacity-60"
                  >
                    {invoiceBusy === row.id ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    ) : (
                      <Download className="size-3" aria-hidden />
                    )}
                    فاکتور
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Section>

      <Section title="پله و تبلیغات" count={data.boosts.length + data.ads.length}>
        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-ink">درخواست‌های افزایش بازدید</h4>
            <DataTable
              head={['نوع', 'شناسه هدف', 'وضعیت', 'درخواست', 'تصمیم', 'یادداشت']}
              empty="درخواستی ثبت نشده است."
            >
              {data.boosts.map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="px-3 py-2 text-xs font-semibold text-ink">
                    {kindLabel(row.kind)}
                  </td>
                  <td dir="ltr" className="px-3 py-2 text-right text-[10px] text-muted">
                    {row.targetId}
                  </td>
                  <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                  <td className="px-3 py-2 text-xs text-muted">{faDate(row.requestedAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{faDate(row.decidedAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {row.adminNote ?? row.note ?? '—'}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-ink">درخواست‌های تبلیغ</h4>
            <DataTable
              head={['نوع', 'محل', 'وضعیت', 'شروع', 'پایان', 'یادداشت']}
              empty="درخواستی ثبت نشده است."
            >
              {data.ads.map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="px-3 py-2 text-xs font-semibold text-ink">
                    {kindLabel(row.kind)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{kindLabel(row.placement)}</td>
                  <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                  <td className="px-3 py-2 text-xs text-muted">{faDate(row.startedAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{faDate(row.endsAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {row.adminNote ?? row.note ?? '—'}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>
      </Section>

      <Section title="امتیازها و جایزه‌ها" count={data.pointsLedger.length}>
        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-ink">گردش امتیاز</h4>
            <DataTable head={['دلیل', 'تغییر', 'موجودیت', 'تاریخ']} empty="گردشی ثبت نشده است.">
              {data.pointsLedger.map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="px-3 py-2 text-xs font-semibold text-ink">{row.reason}</td>
                  <td
                    className={cn(
                      'px-3 py-2 text-xs font-bold',
                      row.delta < 0 ? 'text-red-600' : 'text-emerald-700',
                    )}
                  >
                    {row.delta > 0 ? '+' : ''}
                    {faNumber(row.delta)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {kindLabel(row.entityType)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-ink">جوایز دریافت‌شده</h4>
            <DataTable head={['جایزه', 'امتیاز', 'توضیح', 'تاریخ']} empty="جایزه‌ای دریافت نشده است.">
              {data.rewardRedemptions.map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="px-3 py-2 text-xs font-semibold text-ink">{row.reward.title}</td>
                  <td className="px-3 py-2 text-xs text-muted">{faNumber(row.pointsSpent)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{row.detail ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted">{faDate(row.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>
      </Section>

      <Section title="استعلام‌های هویتی" count={data.identityInquiries.length}>
        <DataTable
          head={[
            'نوع',
            'وضعیت',
            'کد ملی',
            'موبایل',
            'نتیجه',
            'مبلغ',
            'تاریخ',
            'پاسخ کامل',
          ]}
          empty="استعلامی ثبت نشده است."
        >
          {data.identityInquiries.map((row) => (
            <tr key={row.id} className="border-t border-[var(--vintage-border)]">
              <td className="px-3 py-2 text-xs font-semibold text-ink">{kindLabel(row.kind)}</td>
              <td className="px-3 py-2"><StatusPill value={row.status} /></td>
              <td dir="ltr" className="px-3 py-2 text-right text-xs text-muted">
                {row.nationalCode ?? '—'}
              </td>
              <td dir="ltr" className="px-3 py-2 text-right text-xs text-muted">
                {row.phone ?? '—'}
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {row.matched === null ? '—' : row.matched ? 'مطابقت دارد' : 'مطابقت ندارد'}
                {row.message ? ` · ${row.message}` : ''}
              </td>
              <td className="px-3 py-2 text-xs text-muted">{toman(row.amount)}</td>
              <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
              <td className="px-3 py-2 text-xs text-muted">
                {row.raw ? (
                  <details>
                    <summary className="cursor-pointer font-bold text-brand">
                      مشاهده
                    </summary>
                    <pre
                      dir="ltr"
                      className="mt-1 max-h-56 min-w-[240px] overflow-auto whitespace-pre-wrap break-all text-[10px] leading-5"
                    >
                      {JSON.stringify(row.raw, null, 2)}
                    </pre>
                  </details>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Section>

      <Section title="تیکت‌ها و پشتیبانی" count={data.tickets.length + data.supportConversations.length}>
        <DataTable head={['موضوع', 'اولویت', 'پیام‌ها', 'وضعیت', 'تاریخ']} empty="تیکتی ثبت نشده است.">
          {data.tickets.map((row) => (
            <tr key={row.id} className="border-t border-[var(--vintage-border)]">
              <td className="px-3 py-2 text-xs font-semibold text-ink">{row.subject}</td>
              <td className="px-3 py-2 text-xs text-muted">{statusLabel(row.priority)}</td>
              <td className="px-3 py-2 text-xs text-muted">{faNumber(row._count.messages)}</td>
              <td className="px-3 py-2"><StatusPill value={row.status} /></td>
              <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
        <div className="mt-5">
          <h4 className="mb-2 text-xs font-extrabold text-ink">گفتگوهای پشتیبانی آنلاین</h4>
          <DataTable head={['آخرین پیام', 'پیام‌ها', 'وضعیت', 'آخرین فعالیت']} empty="گفتگویی ثبت نشده است.">
            {data.supportConversations.map((row) => (
              <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                <td className="max-w-[320px] truncate px-3 py-2 text-xs text-muted">
                  {row.lastMessagePreview ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{faNumber(row._count.messages)}</td>
                <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.lastMessageAt)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Section>

      <Section
        title="فعالیت حساب"
        count={
          data.notifications.length + data.sessions.length + data.activityLogs.length
        }
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-ink">اعلان‌های کاربر</h4>
            <DataTable head={['عنوان', 'متن', 'وضعیت', 'تاریخ']} empty="اعلانی ثبت نشده است.">
              {data.notifications.map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="px-3 py-2 text-xs font-semibold text-ink">{row.title}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted">
                    {row.body ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {row.readAt ? 'خوانده‌شده' : 'خوانده‌نشده'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-ink">نشست‌ها</h4>
            <DataTable head={['دستگاه', 'IP', 'ورود', 'آخرین استفاده', 'انقضا']} empty="نشستی ثبت نشده است.">
              {data.sessions.map((row) => (
                <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                  <td className="max-w-[260px] truncate px-3 py-2 text-[11px] text-muted" dir="ltr">
                    {row.userAgent ?? '—'}
                  </td>
                  <td dir="ltr" className="px-3 py-2 text-right text-[11px] text-muted">
                    {row.ip ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.lastUsedAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.expiresAt)}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-extrabold text-ink">تاریخچه‌ی فعالیت</h4>
          <DataTable
            head={['اقدام', 'خلاصه', 'نقش عامل', 'موجودیت', 'تاریخ']}
            empty="فعالیتی ثبت نشده است."
          >
            {data.activityLogs.map((row) => (
              <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                <td dir="ltr" className="px-3 py-2 text-right text-[10px] text-muted">
                  {row.action}
                </td>
                <td className="max-w-[360px] px-3 py-2 text-xs text-ink">{row.summary}</td>
                <td className="px-3 py-2 text-xs text-muted">
                  {row.actorEmail ?? row.actorRole ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {row.entityType ? `${kindLabel(row.entityType)} — ${row.entityId ?? ''}` : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-extrabold text-ink">ایمیل‌های ارسالی</h4>
          <DataTable head={['گیرنده', 'موضوع', 'نوع', 'وضعیت', 'تاریخ']} empty="ایمیلی ارسال نشده است.">
            {data.sentEmails.map((row) => (
              <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                <td dir="ltr" className="px-3 py-2 text-right text-xs text-muted">
                  {row.to}
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-ink">{row.subject}</td>
                <td className="px-3 py-2 text-xs text-muted">{row.purpose ?? '—'}</td>
                <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                <td className="px-3 py-2 text-xs text-muted">{faDateTime(row.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Section>

      {data.profileChangeRequests.length > 0 ||
      data.reviews.length > 0 ||
      data.claimRequests.length > 0 ? (
        <Section
          title="سایر سوابق"
          count={
            data.profileChangeRequests.length +
            data.reviews.length +
            data.claimRequests.length
          }
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-extrabold text-ink">درخواست‌های تغییر پروفایل</h4>
              <DataTable head={['تغییرات', 'وضعیت', 'دلیل', 'تاریخ']} empty="درخواستی ثبت نشده است.">
                {data.profileChangeRequests.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                    <td className="max-w-[260px] px-3 py-2">
                      <code className="block break-all text-[10px] text-muted" dir="ltr">
                        {JSON.stringify(row.changes)}
                      </code>
                    </td>
                    <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                    <td className="px-3 py-2 text-xs text-muted">{row.reason ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted">{faDate(row.createdAt)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-extrabold text-ink">نظرات ثبت‌شده</h4>
              <DataTable head={['کسب‌وکار', 'امتیاز', 'متن', 'وضعیت', 'تاریخ']} empty="نظری ثبت نشده است.">
                {data.reviews.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                    <td className="px-3 py-2 text-xs font-semibold text-ink">
                      {row.businessCard.fullName}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{faNumber(row.rating)}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-xs text-muted">
                      {row.comment ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {row.isHidden ? 'پنهان' : 'نمایش'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{faDate(row.createdAt)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-extrabold text-ink">درخواست‌های تصاحب کارت</h4>
              <DataTable
                head={['کارت', 'وضعیت', 'یادداشت', 'تصمیم', 'تاریخ']}
                empty="درخواستی ثبت نشده است."
              >
                {data.claimRequests.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--vintage-border)]">
                    <td className="px-3 py-2 text-xs font-semibold text-ink">
                      {row.businessCard.fullName}
                    </td>
                    <td className="px-3 py-2"><StatusPill value={row.status} /></td>
                    <td className="px-3 py-2 text-xs text-muted">{row.note ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {row.decidedBy?.fullName ?? row.decidedBy?.email ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{faDate(row.createdAt)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
