import { toast } from './toast';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const VISITOR_STORAGE_KEY = 'alooshomal_visitor';

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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? Array.isArray(payload.message)
          ? payload.message.join('، ')
          : String(payload.message)
        : 'خطا در ارتباط با سرور';
    const error = new ApiError(message, response.status);
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
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
  };
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

export interface AdminSettingsPayload {
  directoryPageSize: number;
  adminListPageSize: number;
}
