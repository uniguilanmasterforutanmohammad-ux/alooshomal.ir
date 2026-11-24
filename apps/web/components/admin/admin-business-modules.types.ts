/** Shared shapes for the admin «ماژول‌های کسب‌وکار» panels. */

export interface AdminModuleRow {
  key: string;
  label: string;
  description: string;
  group: string;
  billable: boolean;
  defaultEnabled: boolean;
  enforced?: boolean;
  featureFlag?: string;
  dependsOn?: string[];
  nav?: { href: string; label: string; icon: string; exact?: boolean };
  publicRoutes?: string[];
  capabilities?: string[];
  price: number;
  months: number;
  priceActive: boolean;
  priceDescription: string | null;
  enabledWorkspaces: number;
}

export interface AdminCatalog {
  modules: AdminModuleRow[];
  totals: { workspaces: number };
}

export interface AdminManagementModule {
  key: string;
  label: string;
  group: string;
  billable: boolean;
  defaultEnabled: boolean;
  price: number;
  months: number;
  priceActive: boolean;
}

export interface AdminManagement {
  key: string;
  label: string;
  description: string;
  available: boolean;
  isBase: boolean;
  categories: Array<{ id: string; name: string }>;
  needsCategory: boolean;
  modules: AdminManagementModule[];
  totalPrice: number;
  discounts: { 3: number; 6: number; 12: number };
  terms: Array<{ months: 1 | 3 | 6 | 12; price: number; discount: number }>;
  productCode: string | null;
  productCodes: Record<string, string | null>;
  lastSyncedAt: string | null;
  simulated: boolean;
}

export interface AdminCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AdminWorkspaceRow {
  id: string;
  name: string;
  industryKey: string;
  isDefault: boolean;
  createdAt: string;
  owner: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  modules: Array<{
    moduleKey: string;
    enabled: boolean;
    paidUntil: string | null;
  }>;
}
