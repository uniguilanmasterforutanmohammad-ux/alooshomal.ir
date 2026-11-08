import type { BoostStatus, RequestPaymentInfo } from './boosts';

export type AdTargetKind = 'BIOLINK' | 'BUSINESS_CARD' | 'FEED';

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
  placement?: 'HOME' | 'DIRECTORY';
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
  decidedBy?: { id: string; email: string | null; fullName: string | null } | null;
  payment?: RequestPaymentInfo | null;
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
  feeds: AdTargetItem[];
  requests: AdRequest[];
  settings: { durationDays: number; dailySlots: number };
  meta?: {
    page: number;
    limit: number;
    biolinkTotal: number;
    cardTotal: number;
    feedTotal: number;
    biolinkTotalPages: number;
    cardTotalPages: number;
    feedTotalPages: number;
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
