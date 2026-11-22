/**
 * Shape of `GET /profile/asset-defaults` — the verified identity data the
 * business-card / biolink builder starts from, plus the admin-tunable form
 * rules (which fields are locked and the paid submit label).
 */
export interface AssetFormRules {
  lockedFields: string[];
  submitLabel: string;
  allowMobileChange: boolean;
  allowMobileAdd: boolean;
}

export interface AssetVerifiedPhone {
  phone: string;
  nationalCode: string | null;
  verifiedAt: string | null;
  source: 'ACCOUNT' | 'SHAHKAR';
}

export interface AssetDefaults {
  fullName: string;
  mobile: string;
  businessId: string;
  cityId: string;
  nationalCode: string | null;
  verifiedPhones: AssetVerifiedPhone[];
  shahkarPrice: number;
  config: {
    businessCard: AssetFormRules;
    biolink: AssetFormRules;
  };
}

/** Phones that still need a paid Shahkar inquiry before submit. */
export function phonesNeedingInquiry(
  defaults: AssetDefaults | null,
  mobile: string,
  extraMobiles: string[],
): string[] {
  if (!defaults) return [];
  const verified = new Set(defaults.verifiedPhones.map((entry) => entry.phone));
  const candidates = [mobile, ...extraMobiles].filter(Boolean);
  return Array.from(new Set(candidates)).filter((phone) => !verified.has(phone));
}
