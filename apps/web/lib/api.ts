import { toast } from './toast';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const VISITOR_STORAGE_KEY = 'alooshomal_visitor';

/**
 * Single-flight refresh promise. When several requests fail with 401 at the
 * same moment they all await the same token exchange instead of racing and
 * burning the (rotating) refresh token.
 */
let refreshInFlight: Promise<boolean> | null = null;

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

async function refreshSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      // The refresh token lives in an HttpOnly cookie, so the request only has
      // to ask for a rotation — no token is read or sent by JS.
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { data?: RefreshResult };
      if (!payload?.data?.accessToken) return false;
      window.localStorage.setItem('alooshomal_token', payload.data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * A random per-browser id used to attribute likes without requiring login.
 * Persisted in localStorage so a visitor can only like an item once.
 */
function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await send<T>(path, options, 0);
  return parse<T>(response);
}

/**
 * Performs the request, transparently refreshing an expired access token once.
 * A 401 with a stored refresh token triggers a silent rotation and one retry;
 * a second 401 (or no refresh token) is surfaced to the caller so it can send
 * the user back to the login page.
 */
async function send<T>(
  path: string,
  options: RequestInit,
  attempt: number,
): Promise<Response> {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('alooshomal_token')
      : null;

  const visitorId = getVisitorId();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      // FormData sets its own multipart boundary; only default to JSON when the
      // caller hasn't supplied a body form.
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(visitorId ? { 'x-visitor-id': visitorId } : {}),
      ...(options.headers ?? {}),
    },
    // Required so the HttpOnly refresh cookie is sent to the API origin.
    credentials: 'include',
    cache: 'no-store',
  });

  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/phone/') ||
    path.startsWith('/auth/register');

  if (response.status === 401 && attempt === 0 && !isAuthEndpoint) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return send<T>(path, options, 1);
    }
    // Refresh failed: clear the dead session so the UI can redirect to login.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('alooshomal_token');
      window.dispatchEvent(new Event('alooshomal:session-expired'));
    }
  }
  return response;
}

async function parse<T>(response: Response): Promise<T> {

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string; code?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? Array.isArray(payload.message)
          ? payload.message.join('، ')
          : String(payload.message)
        : 'خطا در ارتباط با سرور';
    const code =
      payload && 'code' in payload && typeof payload.code === 'string'
        ? payload.code
        : undefined;
    const error = new ApiError(message, response.status, code);
    // Surface every failed request as a dismissible bubble (10s) so no error
    // passes silently — the page-level banner remains for inline context.
    if (typeof window !== 'undefined') {
      toast.error(message, 'خطا');
    }
    throw error;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** multipart/form-data POST (file uploads). */
  upload: <T>(path: string, body: FormData) =>
    request<T>(path, { method: 'POST', body }),
};

export interface UploadResult {
  url: string;
  key: string;
  width: number;
  height: number;
  size: number;
  contentType: string;
}

export interface Biolink {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  linkedin: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  primaryColor: string;
  template: string;
  isPublished: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED';
  rejectionReason: string | null;
  cityId?: string | null;
  businessId?: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
  /** owner's subscription plan name, shown on the public page */
  planName?: string | null;
  /** published business card this biolink is linked to (public pages only) */
  linkedBusinessCard?: LinkedCounterpart | null;
  /** the linked business card on the owner's own biolink (edit form) */
  businessCard?: { id: string; slug: string; fullName: string } | null;
  // enriched on /biolinks/mine
  likeCount?: number;
  saveCount?: number;
  views?: number;
  boostStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  rank?: OwnerRank | null;
}

export interface OwnerRank {
  rank: number | null;
  page: number | null;
  total: number | null;
  pageSize: number | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
  user: {
    id: string;
    email: string | null;
    phone?: string | null;
    fullName: string | null;
    role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
  };
  isNewUser?: boolean;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
}

export interface DirectoryBiolink {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  template: string;
  publishedAt: string | null;
  pinnedAt?: string | null;
  boostedUntil?: string | null;
  likeCount: number;
  liked: boolean;
  saved: boolean;
}

export interface DirectoryFacet {
  id: string;
  name: string;
}

/** The linked counterpart of a biolink / business card, when it is published. */
export interface LinkedCounterpart {
  slug: string;
  link: string;
}

export interface DirectoryResponse {
  items: DirectoryBiolink[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    cities: DirectoryFacet[];
    businesses: DirectoryFacet[];
  };
}

export interface BusinessCard {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  linkedin: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  primaryColor: string;
  template: string;
  isPublished: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED';
  rejectionReason: string | null;
  cityId?: string | null;
  businessId?: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
  /** owner's subscription plan name, shown on the public page */
  planName?: string | null;
  /** published biolink this card is linked to (public pages only) */
  linkedBiolink?: LinkedCounterpart | null;
  /** the linked biolink on the owner's own card (edit form) */
  linkedBiolinks?: Array<{ id: string; slug: string; fullName: string }>;
  // enriched on /business-cards/mine
  likeCount?: number;
  saveCount?: number;
  views?: number;
  boostStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  rank?: OwnerRank | null;
}

export interface DirectoryBusinessCard {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  template: string;
  publishedAt: string | null;
  pinnedAt?: string | null;
  boostedUntil?: string | null;
  likeCount: number;
  liked: boolean;
  saved: boolean;
}

export interface DirectoryBusinessCardResponse {
  items: DirectoryBusinessCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    cities: DirectoryFacet[];
    businesses: DirectoryFacet[];
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'CANCELLED';

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
  adminNote: string | null;
  plan?: SubscriptionPlan;
  user?: { id: string; email: string; fullName: string | null };
}

export interface MySubscriptions {
  plan: SubscriptionPlan | null;
  requests: UserSubscription[];
}

export type BoostTargetKind = 'BIOLINK' | 'BUSINESS_CARD';
export type BoostStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BoostTargetItem {
  id: string;
  slug: string;
  fullName: string;
  status: string;
  isPublished: boolean;
  boostedUntil: string | null;
  lastBoostedAt?: string | null;
  pinnedAt?: string | null;
  views: number;
  likes: number;
  rank?: {
    rank: number | null;
    page: number | null;
    total: number | null;
    pageSize: number | null;
  };
}

export interface SavedItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  avatarUrl: string | null;
  primaryColor: string;
  template: string;
  likeCount: number;
  savedAt: string;
}

export interface BoostRequest {
  id: string;
  userId: string;
  kind: BoostTargetKind;
  targetId: string;
  feature: 'POLE';
  status: BoostStatus;
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
  adminNote: string | null;
  target?: { id: string; fullName: string; slug: string } | null;
  user?: { id: string; email: string; fullName: string | null };
}

export interface BoostOverview {
  biolinks: BoostTargetItem[];
  businessCards: BoostTargetItem[];
  requests: BoostRequest[];
  meta?: {
    page: number;
    limit: number;
    biolinkTotal: number;
    biolinkTotalPages: number;
    cardTotal: number;
    cardTotalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type AdTargetKind = 'BIOLINK' | 'BUSINESS_CARD';

export interface AdTargetItem {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  isPublished: boolean;
  approved: boolean;
}

export interface AdRequest {
  id: string;
  userId: string;
  kind: AdTargetKind;
  targetId: string;
  status: BoostStatus;
  requestedAt: string;
  decidedAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  note: string | null;
  adminNote: string | null;
  displayState?: AdDisplayState;
  target?: { id: string; fullName: string; slug: string } | null;
  user?: { id: string; email: string; fullName: string | null };
}

/** Where an approved ad sits in its display window (computed by the API). */
export type AdDisplayState =
  | 'PENDING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED';

export interface AdsOverview {
  businessCards: AdTargetItem[];
  biolinks: AdTargetItem[];
  requests: AdRequest[];
  settings: { durationDays: number; dailySlots: number };
  meta?: {
    page: number;
    limit: number;
    biolinkTotal: number;
    cardTotal: number;
    biolinkTotalPages: number;
    cardTotalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** One currently-running home-page ad (already resolved to a public page). */
export interface ActiveAd {
  id: string;
  kind: AdTargetKind;
  href: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  city: { id: string; name: string } | null;
  business: { id: string; name: string } | null;
}

/** Server-side pagination envelope returned by the user's own lists. */
export interface Paged<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface AppNotification {
  id: string;
  userId: string | null;
  audience: 'USER' | 'ADMIN';
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: AppNotification[];
  unread: number;
  total: number;
}

export interface NotificationPage {
  items: AppNotification[];
  unread: number;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type NewsStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface NewsCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface NewsHeadline {
  id: string;
  title: string;
  summary: string | null;
  publisherName: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
}

export interface NewsItem extends NewsHeadline {
  body: string | null;
  status: NewsStatus;
  reason: string | null;
  author: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
  } | null;
}

export interface NewsListResponse {
  items: NewsItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ReporterSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AdminSettingsPayload {
  directoryPageSize: number;
  directoryDisplayMode: 'PAGINATION' | 'INFINITE';
  adminListPageSize: number;
}

// ---------------------------------------------------------------------------
//  «امتیاز» (points) + rewards
// ---------------------------------------------------------------------------

export type RewardKind = 'SUBSCRIPTION' | 'AD_HOME' | 'AD_DIRECTORY';

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  kind: RewardKind;
  points: number;
  planId: string | null;
  plan?: { id: string; name: string } | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  pointsSpent: number;
  detail: string | null;
  createdAt: string;
  reward?: { id: string; title: string };
  user?: { id: string; email: string | null; fullName: string | null };
}

export interface PointsSummary {
  balance: number;
  ledger: PointsLedgerEntry[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  pointsPerNews: number;
}

export interface AdminPointsOverview {
  topUsers: Array<{
    id: string;
    email: string | null;
    fullName: string | null;
    pointsBalance: number;
  }>;
  redemptions: RewardRedemption[];
  rewardCount: number;
}

// ---------------------------------------------------------------------------
//  «فیدها» (feed)
// ---------------------------------------------------------------------------

export interface FeedTopic {
  id: string;
  name: string;
  isActive: boolean;
}

export interface FeedPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  postsQuota: number;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
}

export interface FeedSubscription {
  id: string;
  userId: string;
  packageId: string;
  status: SubscriptionStatus;
  requestedAt: string;
  decidedAt: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  postsUsed: number;
  note: string | null;
  adminNote: string | null;
  package?: FeedPackage | { id: string; name: string; postsQuota: number };
  user?: { id: string; email: string | null; fullName: string | null };
}

export interface FeedPost {
  id: string;
  userId: string;
  body: string | null;
  images: string[];
  topicId: string | null;
  status: NewsStatus;
  reason: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  likeCount: number;
  createdAt: string;
  user?: { id: string; fullName: string | null; email: string | null };
  topic?: { id: string; name: string } | null;
  liked?: boolean;
  saved?: boolean;
}

export interface FeedDirectoryResponse {
  items: FeedPost[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: { topics: FeedTopic[] };
}

export interface FeedMineOverview {
  packages: FeedPackage[];
  subscriptions: FeedSubscription[];
  posts: FeedPost[];
  topics: FeedTopic[];
  active: FeedSubscription | null;
  limits: { maxImages: number; maxImageKb: number };
}
