export interface BusinessModuleNav {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export interface BusinessModuleDefinition {
  key: string;
  label: string;
  description: string;
  group: string;
  icon: string;
  defaultEnabled: boolean;
  billable: boolean;
  enforced: boolean;
  dependsOn?: string[];
  featureFlag?: string;
  nav?: BusinessModuleNav;
  publicRoutes?: string[];
  capabilities: string[];
}

export interface ResolvedBusinessModule extends BusinessModuleDefinition {
  enabled: boolean;
  available: boolean;
  /** Admin-set price (Toman). 0 = free to enable. */
  price: number;
  /** Term length the price buys, in months (0 = lifetime). */
  months: number;
  purchased: boolean;
  paidUntil: string | null;
  /** Billable module that still needs a purchase before it can be enabled. */
  locked: boolean;
}

export interface IndustryPackage {
  key: string;
  label: string;
  description: string;
  modules: string[];
  defaultModules: string[];
  available?: boolean;
  isBase?: boolean;
  sortOrder?: number;
  discounts?: { 3: number; 6: number; 12: number };
}

export interface BusinessWorkspace {
  id: string;
  name: string;
  /** True while the workspace is only the auto-created placeholder. */
  isPlaceholder: boolean;
  /** A display-name change waiting for admin approval, if any. */
  pendingName: string | null;
  publicSlug: string | null;
  industryKey: string;
  industry: IndustryPackage;
  isDefault: boolean;
  modules: ResolvedBusinessModule[];
  industries: IndustryPackage[];
  capacity: { max: number; used: number };
  /** A management package has been bought, so the industry is fixed. */
  industryLocked: boolean;
  /** End of the paid management term (ISO date) or null. */
  subscriptionPaidUntil: string | null;
}

export interface BusinessWorkspaceSummary {
  id: string;
  name: string;
  industryKey: string;
  industryLabel: string;
  isDefault: boolean;
  enabledModules: number;
  createdAt: string;
}

export interface BusinessModulePrice {
  moduleKey: string;
  price: number;
  months: number;
  isActive: boolean;
  description: string | null;
}

export interface ManagementPackage {
  key: string;
  label: string;
  description: string;
  modules: ResolvedBusinessModule[];
  /** Sum of every billable module's price in this package. */
  totalPrice: number;
  /** Sum of the modules that still need to be bought for this workspace. */
  remainingPrice: number;
  terms: ManagementTerm[];
  active: boolean;
  activeModules: number;
  moduleCount: number;
  /** End of this package's paid term (ISO date) or null. */
  paidUntil: string | null;
  /** One-time renewal offer for a package that is already bought. */
  extension?: ManagementExtension;
}

export interface ManagementExtension {
  /** A longer term can still be bought for this package. */
  allowed: boolean;
  /** The one-time renewal has already been used. */
  alreadyExtended: boolean;
  /** Months of the current paid term. */
  currentMonths: number;
  /** Days left in the current term that get carried over. */
  remainingDays: number;
  /** Longer terms that may be bought to extend the current one. */
  terms: ManagementTerm[];
  /** End of the current paid term (ISO) or null. */
  paidUntil: string | null;
}

export interface ManagementTerm {
  months: 1 | 3 | 6 | 12;
  price: number;
  discount: number;
}

export interface AccommodationPhoto {
  id: string;
  propertyId: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface AccommodationProperty {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  description: string | null;
  propertyType: string;
  cityId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  areaSize: number | null;
  basePrice: number;
  depositAmount: number;
  baseGuests?: number;
  cleaningFee?: number;
  extraGuestFee?: number;
  longStayDiscountPercent?: number;
  longStayMinNights?: number;
  cancellationPolicy?: string;
  cancellationDays?: number;
  unitCount?: number;
  currency: string;
  minNights: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: string[];
  rules: string[];
  instantBooking: boolean;
  rating: number | null;
  reviewsCount: number;
  viewCount?: number;
  externalSource: string | null;
  externalUrl: string | null;
  externalRef: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: AccommodationPhoto[];
  city?: { id: string; name: string } | null;
  _count?: { bookings: number };
  blocks?: AccommodationCalendarBlock[];
  bookings?: AccommodationBooking[];
  reviews?: AccommodationReview[];
  workspace?: {
    id: string;
    name: string;
    publicSlug?: string | null;
    channels: Array<{ id: string; name: string; kind: string; url: string | null }>;
  };
}

export interface AccommodationCalendarBlock {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  source: string;
  createdAt: string;
}

export interface AccommodationRate {
  id: string;
  propertyId: string;
  label: string | null;
  startDate: string;
  endDate: string;
  dayType: 'ALL' | 'WEEKEND' | 'WEEKDAY' | 'HOLIDAY' | string;
  price: number;
  minNights: number | null;
  createdAt: string;
}

export interface AccommodationTask {
  id: string;
  workspaceId: string;
  propertyId: string | null;
  bookingId: string | null;
  title: string;
  kind: 'CLEANING' | 'MAINTENANCE' | 'OTHER' | string;
  dueDate: string | null;
  assignee: string | null;
  status: 'OPEN' | 'DONE' | 'CANCELLED' | string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  property?: { id: string; title: string } | null;
  booking?: {
    id: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
  } | null;
}

export interface AccommodationReview {
  id: string;
  propertyId: string;
  bookingId: string | null;
  guestName: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  status: 'PUBLISHED' | 'HIDDEN' | string;
  createdAt: string;
}

export interface AccommodationChannel {
  id: string;
  workspaceId: string;
  name: string;
  kind: 'OTA' | 'DIRECT' | 'SOCIAL' | 'OTHER' | string;
  url: string | null;
  accountRef: string | null;
  icalUrl: string | null;
  commissionPercent?: number;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { bookings: number };
}

export interface AccommodationBooking {
  id: string;
  workspaceId: string;
  propertyId: string;
  customerId: string | null;
  channelId: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED' | string;
  source: string;
  totalAmount: number | null;
  depositAmount: number;
  depositStatus: 'NONE' | 'PENDING' | 'PAID' | 'REFUNDED' | string;
  depositPaidAt: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  refundAmount?: number;
  refundStatus?: 'NONE' | 'PENDING' | 'PAID' | string;
  createdAt: string;
  property?: { id: string; title: string; slug: string };
  customer?: CrmCustomer | null;
  channel?: AccommodationChannel | null;
}

export interface CrmCustomer {
  id: string;
  workspaceId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  source: string;
  totalBookings: number;
  totalOrders: number;
  totalSpent: number;
  lastInteractionAt: string | null;
  createdAt: string;
  _count?: { bookings: number; interactions: number };
  interactions?: CrmInteraction[];
  bookings?: AccommodationBooking[];
}

export interface CrmInteraction {
  id: string;
  workspaceId: string;
  customerId: string;
  kind: string;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface RetailProduct {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  categoryId: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  brand: string | null;
  specs: Array<{ name: string; value: string }> | null;
  imageUrl: string | null;
  gallery: string[];
  status:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'PUBLISHED'
    | 'REJECTED'
    | 'ARCHIVED';
  publishedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  lowStock?: boolean;
}

export interface RetailProductCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { products: number };
}

export interface RetailProductMeta {
  categories: Array<{ id: string; name: string; slug: string }>;
  maxImages: number;
  maxImageKb: number;
  aiPricePer1k: number;
  aiMinPrice: number;
  aiMinImages: number;
}

export interface RetailAiImportEstimate {
  url: string;
  sourceTitle: string | null;
  estimatedTokens: number;
  pricePer1k: number;
  minPrice: number;
  price: number;
}

export interface RetailAiImportResult {
  product: RetailProduct;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  estimatedTokens: number;
  importId: string;
}

export interface AccommodationAiImportEstimate {
  url: string;
  sourceTitle: string | null;
  estimatedTokens: number;
  pricePer1k: number;
  minPrice: number;
  price: number;
}

export interface AccommodationAiImportResult {
  property: AccommodationProperty;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  estimatedTokens: number;
  importId: string;
  images: number;
}

export interface AccommodationAiImportSettings {
  pricePer1k: number;
  minPrice: number;
  minImages: number;
}

export interface AdminRetailProduct extends RetailProduct {
  workspace: { id: string; name: string; publicSlug: string | null };
  categoryRef: { id: string; name: string } | null;
}

export interface RetailOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface RetailOrder {
  id: string;
  workspaceId: string;
  orderNumber: string;
  trackingToken: string | null;
  customerId: string | null;
  customerUserId?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  payerCardLast4: string | null;
  neighborhood: string | null;
  note: string | null;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'PAID'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | string;
  paymentMethod: 'CARD_TO_CARD' | 'CASH_ON_DELIVERY' | string;
  paymentStatus: 'UNPAID' | 'PENDING_REVIEW' | 'PAID' | 'REFUNDED' | string;
  deliveryMethod: 'SNAP' | 'PICKUP' | string;
  deliveryStatus:
    | 'PENDING'
    | 'PREPARING'
    | 'READY'
    | 'DISPATCHED'
    | 'DELIVERED'
    | 'FAILED'
    | string;
  itemsAmount: number;
  deliveryFee: number;
  totalAmount: number;
  costAmount: number;
  packagingFee: number;
  courierActualFee: number;
  refundAmount: number;
  cancelReason: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: RetailOrderItem[];
  events?: RetailOrderEvent[];
}

export interface RetailOrderEvent {
  id: string;
  orderId: string;
  workspaceId: string;
  kind: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface RetailStockMovement {
  id: string;
  workspaceId: string;
  productId: string;
  kind: 'IN' | 'OUT' | 'ADJUST' | string;
  quantity: number;
  note: string | null;
  createdAt: string;
  product?: { id: string; title: string };
}

export interface RetailInventory {
  products: RetailProduct[];
  movements: RetailStockMovement[];
  lowStockCount: number;
}

export interface PublicShop {
  workspace: { id: string; name: string; publicSlug: string | null };
  products: RetailProduct[];
  settings: RetailShopSettings;
  card: {
    cardNumber: string;
    holderName: string;
    bankName: string | null;
    instructions: string | null;
  } | null;
}

export interface PublicProduct {
  workspace: { id: string; name: string; publicSlug: string | null };
  product: RetailProduct;
  related: RetailProduct[];
  settings: RetailShopSettings;
  card: {
    cardNumber: string;
    holderName: string;
    bankName: string | null;
    instructions: string | null;
  } | null;
}

export interface RetailShopSettings {
  city: string | null;
  neighborhoods: string[];
  deliveryFee: number;
  deliveryEnabled: boolean;
  snapEnabled: boolean;
  pickupEnabled: boolean;
  /** Effective global switch (admin may disable card-to-card site-wide). */
  cardToCardEnabled?: boolean;
  /** Effective global switch (admin may disable cash-on-delivery site-wide). */
  cashOnDeliveryEnabled?: boolean;
  pickupAddress: string | null;
  pickupHours: string | null;
  supportPhone: string | null;
  returnPolicy: string | null;
  reservationMinutes: number;
  /** MANUAL = seller approves order before payment; AUTO = pay immediately. */
  orderApprovalMode?: 'MANUAL' | 'AUTO' | string;
}

export interface RetailReportDay {
  date: string;
  orders: number;
  paidOrders: number;
  gross: number;
  profit: number;
}

export interface RetailReportsOverview {
  rangeDays: number;
  totals: {
    orders: number;
    paidOrders: number;
    grossSales: number;
    refunds: number;
    netSales: number;
    profit: number;
    deliverySplit: { SNAP: number; PICKUP: number };
  };
  unmatchedDeposits: { count: number; amount: number };
  lowStock: Array<{
    id: string;
    title: string;
    stock: number;
    lowStockThreshold: number;
    unit: string;
  }>;
  lowStockCount: number;
  daily: RetailReportDay[];
}

export interface PublicOrderTracking {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryMethod: string;
  deliveryStatus: string;
  itemsAmount: number;
  deliveryFee: number;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  neighborhood: string | null;
  note: string | null;
  createdAt: string;
  readyAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  items: Array<{ title: string; quantity: number; lineTotal: number }>;
  paymentAllowed: boolean;
  orderApprovalMode: string;
  card: {
    cardNumber: string;
    holderName: string;
    bankName: string | null;
    instructions: string | null;
  } | null;
  events: Array<{
    kind: string;
    fromStatus: string | null;
    toStatus: string | null;
    note: string | null;
    createdAt: string;
  }>;
  shop: RetailShopSettings & { name: string; publicSlug: string | null };
}

/** A published product in the `/shop` directory, with its owning shop. */
export interface PublicProduct extends RetailProduct {
  workspace: { id: string; name: string; publicSlug: string | null };
}

/**
 * A purchase the signed-in customer made from a shop. Returned by
 * `GET /retail/my-orders` and shown in the customer panel's purchase history.
 */
export interface MyPurchaseOrder {
  id: string;
  orderNumber: string;
  trackingToken: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryMethod: string;
  deliveryStatus: string;
  itemsAmount: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  items: Array<{ title: string; quantity: number; lineTotal: number }>;
  shop: { name: string; publicSlug: string | null };
  invoiceId: string | null;
}

/** Filter options of the `/shop` directory. */
export interface PublicProductFacets {
  categories: string[];
  shops: Array<{ id: string; name: string; slug: string | null }>;
}

/** Filter options of the `/stay` directory. */
export interface PublicAccommodationFacets {
  cities: Array<{ id: string; name: string }>;
  types: string[];
}

export interface CardToCardAccount {
  id: string;
  workspaceId: string;
  cardNumber: string;
  holderName: string;
  bankName: string | null;
  iban: string | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CardVerificationComposite {
  key: string;
  label: string;
  amount: number;
  purchasable: boolean;
  issues: string[];
}

export interface CardVerificationLatest {
  paymentId: string;
  createdAt: string;
  amount: number;
  status: 'DONE' | 'RUNNING' | string;
  matched: boolean | null;
  iban: string | null;
  cardNumberMasked: string | null;
  applied: boolean;
  message: string | null;
}

export interface CardVerificationOverview {
  available: boolean;
  simulated: boolean;
  composite: CardVerificationComposite | null;
  profile: {
    ready: boolean;
    nationalCodeMasked: string | null;
    hasBirthDate: boolean;
  };
  latest: CardVerificationLatest | null;
}

export interface CardVerificationApplyResult {
  applied: boolean;
  matched: boolean | null;
  iban: string | null;
  account: CardToCardAccount | null;
  message: string;
}

export interface CardToCardPayment {
  id: string;
  workspaceId: string;
  referenceType: string | null;
  referenceId: string | null;
  customerName: string;
  customerPhone: string;
  amount: number;
  expectedAmount: number | null;
  paidAt: string | null;
  trackingNumber: string | null;
  receiptUrl: string;
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  /** RECEIPT (customer upload) | SMS_GATEWAY (automatic bank-SMS match). */
  source?: 'RECEIPT' | 'SMS_GATEWAY' | string;
  smsTransactionId?: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export interface PublicCardInfo {
  workspace: { id: string; name: string };
  card: {
    cardNumber: string;
    holderName: string;
    bankName: string | null;
    instructions: string | null;
  } | null;
}

export interface Building {
  id: string;
  workspaceId: string;
  name: string;
  address: string | null;
  city: string | null;
  managerName: string | null;
  managerPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { units: number; tickets: number };
  units?: BuildingUnit[];
}

export interface BuildingUnit {
  id: string;
  buildingId: string;
  floor: string | null;
  unitNumber: string;
  area: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  residentName: string | null;
  residentPhone: string | null;
  occupancyStart: string | null;
  occupancyEnd: string | null;
  status: 'OCCUPIED' | 'VACANT' | string;
}

export interface BuildingCharge {
  id: string;
  buildingId: string;
  unitId: string;
  title: string;
  period: string | null;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED' | string;
  note: string | null;
  createdAt: string;
  unit?: { id: string; unitNumber: string; floor: string | null; residentName: string | null };
  building?: { id: string; name: string };
}

export interface BuildingPayment {
  id: string;
  buildingId: string;
  unitId: string;
  chargeId: string | null;
  amount: number;
  method: string;
  trackingNumber: string | null;
  receiptUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  paidAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  unit?: { id: string; unitNumber: string };
  charge?: { id: string; title: string; amount: number } | null;
}

export interface BuildingExpense {
  id: string;
  buildingId: string;
  title: string;
  category: string | null;
  amount: number;
  paidAt: string | null;
  vendor: string | null;
  receiptUrl: string | null;
  note: string | null;
  building?: { id: string; name: string };
}

export interface BuildingTicket {
  id: string;
  buildingId: string;
  unitId: string | null;
  title: string;
  description: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | string;
  assignee: string | null;
  cost: number;
  photoUrl: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  unit?: { id: string; unitNumber: string } | null;
  building?: { id: string; name: string };
}

export interface BuildingFinanceOverview {
  charged: number;
  collected: number;
  outstanding: number;
  spent: number;
  balance: number;
  expensesByCategory: Array<{ category: string; amount: number }>;
}

export interface PropertyFile {
  id: string;
  workspaceId: string;
  code: string | null;
  dealType: 'SALE' | 'RENT' | 'MORTGAGE' | string;
  propertyKind: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  area: number | null;
  rooms: number | null;
  floor: string | null;
  price: number | null;
  deposit: number | null;
  rent: number | null;
  features: string[];
  ownerName: string | null;
  ownerPhone: string | null;
  internalNote: string | null;
  status: 'PENDING' | 'ACTIVE' | 'NEEDS_CHECK' | 'DEALT' | 'ARCHIVED' | string;
  published: boolean;
  publicToken: string | null;
  publishedAt: string | null;
  viewCount: number;
  inquiryCount: number;
  source: string;
  duplicateOfId: string | null;
  lastVerifiedAt: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  visits?: PropertyVisit[];
  contracts?: PropertyContract[];
}

export interface PropertyLead {
  id: string;
  workspaceId: string;
  name: string;
  phone: string | null;
  kind: 'BUY' | 'RENT' | string;
  budgetMin: number | null;
  budgetMax: number | null;
  depositMax: number | null;
  rentMax: number | null;
  neighborhoods: string[];
  minArea: number | null;
  rooms: number | null;
  requiredFeatures: string[];
  notes: string | null;
  status: 'NEW' | 'ACTIVE' | 'VISIT' | 'DEAL' | 'LOST' | string;
  source: string | null;
  assignedToId: string | null;
  nextActionAt: string | null;
  onWaitlist: boolean;
  waitlistNote: string | null;
  createdAt: string;
  updatedAt: string;
  visits?: PropertyVisit[];
  contracts?: PropertyContract[];
}

export interface PropertyVisit {
  id: string;
  workspaceId: string;
  propertyId: string;
  leadId: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'NO_SHOW' | string;
  outcome: string | null;
  feedback: string | null;
  offeredPrice: number | null;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; title: string; neighborhood: string | null };
  lead?: { id: string; name: string; phone: string | null };
}

export interface PropertyContract {
  id: string;
  workspaceId: string;
  propertyId: string;
  leadId: string | null;
  agentId: string | null;
  kind: 'SALE' | 'RENT' | string;
  contractDate: string;
  price: number | null;
  deposit: number | null;
  rent: number | null;
  commissionExpected: number;
  commissionCollected: number;
  basis: 'AGREED' | 'COLLECTED' | string;
  officeShare: number;
  agentShare: number;
  referrerShare: number;
  referrerName: string | null;
  status: 'DRAFT' | 'SIGNED' | 'SETTLED' | 'CANCELLED' | string;
  documentUrl: string | null;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; title: string; neighborhood: string | null };
  lead?: { id: string; name: string; phone: string | null } | null;
}

export interface PropertyReportOverview {
  activeFiles: number;
  pendingFiles: number;
  staleFiles: number;
  leadsWithoutFollowUp: number;
  visitsScheduled: number;
  visitsDone: number;
  signedContracts: number;
  conversion: number;
  commissionExpected: number;
  commissionCollected: number;
  commissionOutstanding: number;
  byNeighborhood: Array<{ label: string; count: number }>;
  bySource: Array<{ label: string; count: number }>;
  byAgent: Array<{ agentId: string; expected: number; collected: number; contracts: number }>;
}

export interface EduClass {
  id: string;
  workspaceId: string;
  title: string;
  discipline: 'SPORT' | 'ART' | 'MUSIC' | 'OTHER' | string;
  mode: 'PRIVATE' | 'SEMI_PRIVATE' | 'GROUP' | string;
  delivery: 'IN_PERSON' | 'ONLINE' | 'HYBRID' | string;
  level: string | null;
  capacity: number;
  durationMin: number;
  price: number;
  sessionsPerPackage: number;
  location: string | null;
  coachName: string | null;
  prerequisites: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { enrollments: number; sessions: number };
  enrollments?: EduEnrollment[];
  sessions?: EduSession[];
}

export interface EduStudent {
  id: string;
  workspaceId: string;
  fullName: string;
  phone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  birthDate: string | null;
  goal: string | null;
  level: string | null;
  source: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  notes: string | null;
  nextActionAt: string | null;
  accessToken: string | null;
  createdAt: string;
  updatedAt: string;
  enrollments?: EduEnrollment[];
}

export interface EduEnrollment {
  id: string;
  workspaceId: string;
  studentId: string;
  classId: string;
  packageSessions: number;
  usedSessions: number;
  price: number;
  discount: number;
  paidAmount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string;
  startedAt: string;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; fullName: string; guardianName?: string | null };
  class?: { id: string; title: string; capacity?: number; sessionsPerPackage?: number };
  payments?: EduPayment[];
  progress?: EduProgressNote[];
  installments?: EduInstallment[];
}

export interface EduSession {
  id: string;
  workspaceId: string;
  classId: string;
  scheduledAt: string;
  durationMin: number;
  status: 'SCHEDULED' | 'DONE' | 'CANCELLED_BY_COACH' | 'CANCELLED_BY_STUDENT' | string;
  topic: string | null;
  coachName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  class?: { id: string; title: string };
  _count?: { attendances: number };
}

export interface EduAttendance {
  id: string;
  workspaceId: string;
  sessionId: string;
  enrollmentId: string;
  status: 'PRESENT' | 'ABSENT_EXCUSED' | 'ABSENT' | 'MAKEUP' | string;
  consumesCredit: boolean;
  note: string | null;
}

export interface EduProgressNote {
  id: string;
  workspaceId: string;
  enrollmentId: string;
  sessionId: string | null;
  date: string;
  topic: string | null;
  homework: string | null;
  feedback: string | null;
  privateNote: string | null;
  mediaUrl: string | null;
  nextGoal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EduPayment {
  id: string;
  workspaceId: string;
  enrollmentId: string;
  amount: number;
  method: string;
  trackingNumber: string | null;
  receiptUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  paidAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  enrollment?: {
    id: string;
    student?: { id: string; fullName: string };
    class?: { id: string; title: string };
  };
}

export interface EduExpense {
  id: string;
  workspaceId: string;
  classId: string | null;
  title: string;
  category: string | null;
  amount: number;
  paidAt: string | null;
  vendor: string | null;
  note: string | null;
  class?: { id: string; title: string } | null;
}

export interface EduCoachSettlement {
  id: string;
  workspaceId: string;
  coachName: string;
  classId: string | null;
  period: string | null;
  basis: 'FIXED' | 'PER_SESSION' | 'PERCENT' | string;
  amount: number;
  status: 'PENDING' | 'SETTLED' | string;
  note: string | null;
  class?: { id: string; title: string } | null;
}

export interface EduBalance extends EduEnrollment {
  total: number;
  paid: number;
  balance: number;
}

export interface EduReportOverview {
  activeClasses: number;
  activeStudents: number;
  activeEnrollments: number;
  sessionsDone: number;
  attendanceRate: number;
  totalRevenue: number;
  collected: number;
  receivables: number;
  expiringPackages: number;
  pendingSettlements: number;
  byDiscipline: Array<{ label: string; count: number }>;
  classProfit: Array<{
    classId: string;
    title: string;
    enrolled: number;
    capacity: number;
    utilization: number;
    revenue: number;
    collected: number;
    expenses: number;
    profit: number;
  }>;
}

export interface BuildingMember {
  id: string;
  buildingId: string;
  userId: string;
  role: 'MANAGER' | 'ACCOUNTANT' | 'RESIDENT' | string;
  createdAt: string;
  user: { id: string; email: string | null; fullName: string | null; phone: string | null };
}

export interface BuildingBudget {
  id: string;
  buildingId: string;
  year: number;
  title: string;
  category: string | null;
  amount: number;
  note: string | null;
}

export interface BuildingMeeting {
  id: string;
  buildingId: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  status: 'SCHEDULED' | 'DONE' | 'CANCELLED' | string;
}

export interface BuildingContractor {
  id: string;
  buildingId: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  note: string | null;
}

export interface PropertyCooperation {
  id: string;
  workspaceId: string;
  propertyId: string;
  partnerName: string;
  partnerPhone: string | null;
  shareType: 'PERCENT' | 'FIXED' | string;
  shareValue: number;
  status: 'PROPOSED' | 'ACTIVE' | 'DONE' | 'CANCELLED' | string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; title: string; code: string | null };
}

export interface PropertyAuditLog {
  id: string;
  workspaceId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface PublicProperty {
  token: string | null;
  title: string;
  dealType: string;
  propertyKind: string;
  city: string | null;
  neighborhood: string | null;
  area: number | null;
  rooms: number | null;
  floor: string | null;
  price: number | null;
  deposit: number | null;
  rent: number | null;
  features: string[];
  agency: string;
  publishedAt: string | null;
}

export interface EduInstallment {
  id: string;
  workspaceId: string;
  enrollmentId: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | string;
  paidAt: string | null;
  note: string | null;
  enrollment?: {
    id: string;
    student?: { id: string; fullName: string };
    class?: { id: string; title: string };
  };
}

export interface EduWaitlist {
  id: string;
  workspaceId: string;
  classId: string;
  studentId: string | null;
  name: string;
  phone: string | null;
  note: string | null;
  status: 'WAITING' | 'OFFERED' | 'ENROLLED' | 'CANCELLED' | string;
  createdAt: string;
  updatedAt: string;
  class?: { id: string; title: string; capacity: number };
}

export interface PublicStudentPanel {
  studio: string;
  student: { id: string; fullName: string; guardianName: string | null; level: string | null };
  enrollments: Array<{
    id: string;
    class: { id: string; title: string; coachName: string | null; location: string | null };
    packageSessions: number;
    usedSessions: number;
    price: number;
    discount: number;
    paidAmount: number;
    status: string;
    expiresAt: string | null;
    installments: Array<{ id: string; title: string; amount: number; dueDate: string; status: string }>;
    progress: Array<{
      id: string;
      date: string;
      topic: string | null;
      homework: string | null;
      feedback: string | null;
      mediaUrl: string | null;
      nextGoal: string | null;
    }>;
    payments: Array<{
      id: string;
      amount: number;
      status: string;
      trackingNumber: string | null;
      createdAt: string;
    }>;
  }>;
  upcoming: Array<{ id: string; classId: string; scheduledAt: string; topic: string | null }>;
}
