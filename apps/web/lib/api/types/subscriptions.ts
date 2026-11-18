export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxBiolinks: number;
  maxBusinessCards: number;
  /** تعداد کسب‌وکارهای مجاز در این بسته */
  maxBusinesses: number;
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
  /** PayPing codes of the «+ بسته مدیریت کسب‌وکار» bundle variants. */
  paypingProductCodeWithPackage?: string | null;
  paypingProductCodeWithPackage3Months?: string | null;
  paypingProductCodeWithPackage6Months?: string | null;
  paypingProductCodeWithPackage12Months?: string | null;
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
  /** شروع دوره پس از فعال‌سازی */
  startsAt?: string | null;
  /** پایان دوره پس از فعال‌سازی (null = بدون انقضا) */
  expiresAt?: string | null;
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
  adminNote: string | null;
  plan?: SubscriptionPlan;
  payment?: {
    id: string;
    status: SubscriptionPaymentStatus;
    amount: number;
    paidAt: string | null;
  } | null;
  user?: { id: string; email: string; fullName: string | null };
}

export interface MySubscriptions {
  plan: SubscriptionPlan | null;
  /** شروع دوره‌ی اشتراک فعلی */
  planStartedAt?: string | null;
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
  /** True when the payment also bought the business-management add-on. */
  withBusinessPackage?: boolean;
  /** Part of `amount` that pays for the add-on packages. */
  businessAmount?: number;
  /** ISO expiry the plan and every add-on package share. */
  expiresAt?: string;
  businessPackages?: Array<{
    workspaceId: string;
    packageKey: string;
    label: string;
    businessName: string;
    amount: number;
    months: number;
    paidUntil: string;
  }>;
}

/** One business in the «بسته مدیریت کسب‌وکار» add-on quote. */
export interface SubscriptionAddonQuoteBusiness {
  workspaceId: string;
  name: string;
  industryKey: string;
  industryLabel: string;
  /** Prorated price of the management for the covered days. */
  amount: number;
  months: number;
  paidUntil: string;
  /** False when the industry has no price yet. */
  available: boolean;
  /** Existing management expiry, so a renewal can be labelled as such. */
  currentPaidUntil: string | null;
}

/** The add-on quote shown in the purchase cart before paying. */
export interface SubscriptionAddonQuote {
  plan: { id: string; name: string };
  /** False for the free plan, which can never buy the add-on. */
  allowed: boolean;
  /** True when the quote is for the mid-term (add-on-only) purchase. */
  addonOnly?: boolean;
  maxBusinesses: number;
  months: number;
  days: number;
  expiresAt: string;
  workspaces: SubscriptionAddonQuoteBusiness[];
  /** Every available «مدیریت کسب‌وکار» package with its term price. */
  packages?: SubscriptionAddonQuotePackage[];
}

/** One selectable management package shown in the onboarding cart. */
export interface SubscriptionAddonQuotePackage {
  key: string;
  label: string;
  amount: number;
  months: number;
  available: boolean;
}
