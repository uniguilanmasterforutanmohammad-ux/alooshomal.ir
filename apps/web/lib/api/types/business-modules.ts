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
}

export interface BusinessWorkspace {
  id: string;
  name: string;
  industryKey: string;
  industry: IndustryPackage;
  isDefault: boolean;
  modules: ResolvedBusinessModule[];
  industries: IndustryPackage[];
  capacity: { max: number; used: number };
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
  basePrice: number;
  depositAmount: number;
  currency: string;
  minNights: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: AccommodationPhoto[];
  city?: { id: string; name: string } | null;
  _count?: { bookings: number };
  blocks?: AccommodationCalendarBlock[];
  bookings?: AccommodationBooking[];
  workspace?: {
    id: string;
    name: string;
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

export interface AccommodationChannel {
  id: string;
  workspaceId: string;
  name: string;
  kind: 'OTA' | 'DIRECT' | 'SOCIAL' | 'OTHER' | string;
  url: string | null;
  accountRef: string | null;
  icalUrl: string | null;
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
