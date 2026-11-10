import type { AdRequest } from './ads';
import type { SubscriptionPaymentStatus } from './subscriptions';

export type BoostTargetKind = 'BIOLINK' | 'BUSINESS_CARD' | 'FEED';

export type BoostStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Online prepayment of a «پله»/ad request (gateway configured). `url` is the
 * PayPing checkout link while the payment is still pending; `null` afterwards.
 */

export interface RequestPaymentInfo {
  amount: number;
  status: SubscriptionPaymentStatus;
  /** PayPing checkout link while the payment is still pending (dashboard only). */
  url?: string | null;
}

export interface BoostTargetItem {
  id: string;
  slug: string;
  fullName: string;
  status: string;
  isPublished: boolean;
  boostedUntil: string | null;
  /** paid directory-ad expiry (when in the future the item sits at the top) */
  adDirectoryUntil?: string | null;
  lastBoostedAt?: string | null;
  adStatus?: BoostStatus | null;
  directoryAdStatus?: BoostStatus | null;
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
  payment?: RequestPaymentInfo | null;
  /** Present when the fee was added to the wallet instead of a gateway call. */
  wallet?: { charged: number; balance: number } | null;
}

export interface BoostOverview {
  biolinks: BoostTargetItem[];
  businessCards: BoostTargetItem[];
  feeds: BoostTargetItem[];
  requests: BoostRequest[];
  /**
   * The user's ad requests (both «تبلیغ در دایرکتوری» and «تبلیغ در صفحه اول»),
   * so the merged «افزایش بازدید» panel can show their full history — the
   * standalone home/directory ad panels were removed in the merge.
   */
  adRequests: AdRequest[];
  meta?: {
    page: number;
    limit: number;
    biolinkTotal: number;
    biolinkTotalPages: number;
    cardTotal: number;
    cardTotalPages: number;
    feedTotal: number;
    feedTotalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
