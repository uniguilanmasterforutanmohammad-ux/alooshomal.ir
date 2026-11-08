import type { NewsStatus } from './moderation';
import type { SubscriptionStatus } from './subscriptions';

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
  /** paid tag: the author's own card/biolink linked to the post */
  tagKind?: 'BIOLINK' | 'BUSINESS_CARD' | null;
  tagPaid?: boolean;
  tagPrice?: number | null;
  /** resolved public tag (only when `tagPaid`) */
  tag?: FeedTag | null;
  tagBiolinkId?: string | null;
  tagBusinessCardId?: string | null;
  /** «پله» promotion expiry */
  boostedUntil?: string | null;
  /** paid directory-ad expiry */
  adDirectoryUntil?: string | null;
  /** set on /feeds/mine/saved */
  savedAt?: string;
  user?: { id: string; fullName: string | null; email: string | null };
  topic?: { id: string; name: string } | null;
  liked?: boolean;
  saved?: boolean;
}

/** A visitor comment on a feed post (moderated before it is public). */

export interface FeedComment {
  id: string;
  feedPostId: string;
  userId: string;
  body: string;
  status: NewsStatus;
  reason: string | null;
  decidedAt: string | null;
  createdAt: string;
  user?: { id: string; fullName: string | null; email: string | null };
  feedPost?: {
    id: string;
    body: string | null;
    images: string[];
    user?: { fullName: string | null; email: string | null };
  };
}

export interface FeedCommentsResponse {
  items: FeedComment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** The author's own view: approved comments plus their pending/rejected ones. */

export interface MyFeedCommentsResponse {
  items: FeedComment[];
  mineCount: number;
  approvedCount: number;
}

/** The resolved tag on a feed post (the author's own card/biolink). */

export interface FeedTag {
  kind: 'BIOLINK' | 'BUSINESS_CARD';
  slug: string;
  fullName: string;
  company: string | null;
  /** optional details surfaced when the tag is shown as a fuller card */
  jobTitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  cityName?: string | null;
  businessName?: string | null;
  href: string;
}

/** One of the author's own published items, selectable as a feed-post tag. */

export interface FeedTaggableItem {
  id: string;
  slug: string;
  fullName: string;
  company: string | null;
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
  /** set when the active subscription is inside its window but out of quota */
  exhausted: FeedSubscription | null;
  /** packages the user may switch to right now (a strict upgrade when exhausted) */
  upgradePackageIds: string[];
  limits: { maxImages: number; maxImageKb: number };
  /** price (Toman) for tagging a card/biolink on a post */
  tagPrice: number;
  /** the author's own published items available to tag */
  taggableBiolinks: FeedTaggableItem[];
  taggableCards: FeedTaggableItem[];
}
