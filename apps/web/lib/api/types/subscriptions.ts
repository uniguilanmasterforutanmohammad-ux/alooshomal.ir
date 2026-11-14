export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxBiolinks: number;
  maxBusinessCards: number;
  showSocialLinks: boolean;
  hiddenFields: string[];
  features: string[];
  /** درصد تخفیف دوره‌های چندماهه (۰ تا ۱۰۰) بر پایه‌ی قیمت یک‌ماهه */
  discount3Months: number;
  discount6Months: number;
  discount12Months: number;
  isActive: boolean;
  sortOrder: number;
  /** PayPing «آیتم مالی» code mirrored from this plan, when synced. */
  paypingProductCode?: string | null;
  paypingProductCode3Months?: string | null;
  paypingProductCode6Months?: string | null;
  paypingProductCode12Months?: string | null;
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
  /** طول دوره به ماه (۱ = ماهانه، ۳/۶/۱۲ = دوره‌های تخفیف‌دار) */
  months?: number;
  /** پایان دوره پس از فعال‌سازی (null = بدون انقضا) */
  expiresAt?: string | null;
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
  adminNote: string | null;
  plan?: SubscriptionPlan;
  user?: { id: string; email: string; fullName: string | null };
}

export interface MySubscriptions {
  plan: SubscriptionPlan | null;
  /** پایان دوره‌ی اشتراک فعلی (null = بدون انقضا) */
  planExpiresAt?: string | null;
  requests: UserSubscription[];
  payments?: SubscriptionPayment[];
}

export type SubscriptionPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELED';

export interface SubscriptionPayment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  /** طول دوره‌ی خریداری‌شده به ماه */
  months?: number;
  status: SubscriptionPaymentStatus;
  clientRefId: string;
  paymentCode: string | null;
  refId: string | null;
  gatewayUrl: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  plan?: SubscriptionPlan;
}

export interface SubscriptionCheckout {
  paymentId: string | null;
  amount: number;
  /** طول دوره‌ی انتخاب‌شده به ماه */
  months?: number;
  paymentCode: string | null;
  url: string | null;
  paypingProductCode?: string | null;
  /** True when the price was added to the wallet instead of a gateway call. */
  wallet?: boolean;
  plan: { id: string; name: string };
}
