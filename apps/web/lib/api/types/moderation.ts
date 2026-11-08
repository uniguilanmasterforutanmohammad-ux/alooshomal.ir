export type NewsStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Scopes granted to a limited «کاربر ادمین» (content + request queues). */

export type ModeratorScope =
  | 'BIOLINK'
  | 'BUSINESS_CARD'
  | 'FEED'
  | 'NEWS'
  | 'SUBSCRIPTION_REQUESTS'
  | 'AD_REQUESTS'
  | 'DIRECTORY_AD_REQUESTS'
  | 'BOOST_REQUESTS';

export interface ModeratorScopeMeta {
  scope: ModeratorScope;
  group: string;
  label: string;
  hint: string;
}

export interface QueueCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export interface ModeratorMe {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'MODERATOR' | 'ADMIN';
  scopes: ModeratorScope[];
  scopeMeta?: ModeratorScopeMeta[];
  counts: Record<ModeratorScope, QueueCounts>;
}

/** One infinite-scroll page of a moderator review queue. */

export interface ModeratorQueuePage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface ModeratorAccount {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  isActive: boolean;
  moderatorScopes: ModeratorScope[];
  createdAt: string;
}

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

/** One «بلاگ» post (admin team article, optionally with an Aparat video). */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  coverImageUrl: string | null;
  categoryId: string | null;
  tags: string[];
  videoProvider: string | null;
  videoId: string | null;
  videoUrl: string | null;
  status: NewsStatus;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reason: string | null;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; fullName: string | null; email: string | null } | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder?: number;
  _count?: { posts: number };
}

export interface BlogListResponse {
  items: BlogPost[];
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
