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
  isActive: boolean;
  sortOrder: number;
  /** PayPing «آیتم مالی» code mirrored from this plan, when synced. */
  paypingProductCode?: string | null;
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
  paymentId: string;
  amount: number;
  paymentCode: string | null;
  url: string | null;
  paypingProductCode?: string | null;
  plan: { id: string; name: string };
}
