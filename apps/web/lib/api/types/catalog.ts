export interface Biolink {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  linkedin: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  primaryColor: string;
  template: string;
  isPublished: boolean;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED';
  rejectionReason: string | null;
  publishedAt?: string | null;
  cityId?: string | null;
  businessId?: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
  /** owner's subscription plan name, shown on the public page */
  planName?: string | null;
  /** owner passed the identity inquiry and has the blue tick */
  ownerVerified?: boolean;
  /** the owner's plan masks links/socials (free plan) */
  planHidesFields?: boolean;
  /** id of the owner account (public payload only, used to detect "my card") */
  userId?: string | null;
  /** published business card this biolink is linked to (public pages only) */
  linkedBusinessCard?: LinkedCounterpart | null;
  /** the linked business card on the owner's own biolink (edit form) */
  businessCard?: { id: string; slug: string; fullName: string } | null;
  // enriched on /biolinks/mine
  likeCount?: number;
  saveCount?: number;
  views?: number;
  boostStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  adStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  rank?: OwnerRank | null;
}

export interface OwnerRank {
  rank: number | null;
  page: number | null;
  total: number | null;
  pageSize: number | null;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
}

export interface DirectoryBiolink {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  /** landline number (تنها در حالت لیست/دفترچه نمایش داده می‌شود) */
  phone?: string | null;
  /** mobile number */
  mobile?: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  template: string;
  publishedAt: string | null;
  pinnedAt?: string | null;
  boostedUntil?: string | null;
  /** paid directory-ad expiry; when in the future a «تبلیغات» tag is shown */
  adDirectoryUntil?: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
  likeCount: number;
  /** owner passed the identity inquiry and has the blue tick */
  ownerVerified?: boolean;
  liked: boolean;
  saved: boolean;
}

export interface DirectoryFacet {
  id: string;
  name: string;
}

/** One row of the public «دفترچه تلفن» (flat contact list). */

export interface PhonebookEntry {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  publishedAt: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
}

/** The linked counterpart of a biolink / business card, when it is published. */

export interface LinkedCounterpart {
  slug: string;
  link: string;
}

export interface DirectoryResponse {
  items: DirectoryBiolink[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    cities: DirectoryFacet[];
    businesses: DirectoryFacet[];
  };
}

export interface BusinessCard {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  /** optional weekly opening hours, keyed by English weekday name */
  workingHours?: WorkingHours | null;
  /** public gallery image URLs */
  gallery?: string[];
  /** aggregate rating kept in sync by the reviews service */
  ratingAvg?: number;
  ratingCount?: number;
  linkedin: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  whatsapp: string | null;
  primaryColor: string;
  template: string;
  isPublished: boolean;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNPUBLISHED';
  rejectionReason: string | null;
  publishedAt?: string | null;
 cityId?: string | null;
 businessId?: string | null;
 city?: { id: string; name: string } | null;
 business?: { id: string; name: string } | null;
 /** owner's subscription plan name, shown on the public page */
 planName?: string | null;
  /** owner passed the identity inquiry and has the blue tick */
  ownerVerified?: boolean;
 /** the owner's plan masks links/socials (free plan) */
 planHidesFields?: boolean;
 /** id of the owner account (public payload only, used to detect "my card") */
 userId?: string | null;
  /** system-imported profile not yet claimed by its real owner */
  isUnclaimed?: boolean;
 /** published biolink this card is linked to (public pages only) */
 linkedBiolink?: LinkedCounterpart | null;
  /** the linked biolink on the owner's own card (edit form) */
  linkedBiolinks?: Array<{ id: string; slug: string; fullName: string }>;
  // enriched on /business-cards/mine
  likeCount?: number;
  saveCount?: number;
  views?: number;
  boostStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  adStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  rank?: OwnerRank | null;
}

export interface DirectoryBusinessCard {
  id: string;
  slug: string;
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  address?: string | null;
  /** landline number (تنها در حالت لیست/دفترچه نمایش داده می‌شود) */
  phone?: string | null;
  /** mobile number */
  mobile?: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  template: string;
  publishedAt: string | null;
  pinnedAt?: string | null;
  boostedUntil?: string | null;
  /** paid directory-ad expiry; when in the future a «تبلیغات» tag is shown */
  adDirectoryUntil?: string | null;
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
  likeCount: number;
  ratingAvg?: number;
  ratingCount?: number;
  /** owner passed the identity inquiry and has the blue tick */
  ownerVerified?: boolean;
  liked: boolean;
  saved: boolean;
}

export type Weekday =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export interface WorkingHoursDay {
  open?: string;
  close?: string;
  closed?: boolean;
}

export type WorkingHours = Partial<Record<Weekday, WorkingHoursDay>>;

export interface BusinessCategorySummary {
  id: string;
  name: string;
  count: number;
}

export interface CategoryDirectoryResponse {
  category: BusinessCategorySummary;
  items: DirectoryBusinessCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    cities: DirectoryFacet[];
    businesses: DirectoryFacet[];
  };
}

export interface DirectoryBusinessCardResponse {
  items: DirectoryBusinessCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    cities: DirectoryFacet[];
    businesses: DirectoryFacet[];
  };
}
