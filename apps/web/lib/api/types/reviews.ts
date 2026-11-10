export interface BusinessReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  /** true when the signed-in viewer wrote this review */
  mine?: boolean;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** number of reviews for each star value (`1` … `5`) */
  distribution: Record<string, number>;
}

export interface BusinessReviewsPage {
  summary: ReviewSummary;
  items: BusinessReview[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MyBusinessReview {
  review: BusinessReview | null;
  summary: ReviewSummary | null;
}
