/** One supported social platform, as published by the API registry. */
export interface SocialPlatformMeta {
  key: string;
  label: string;
  hint: string;
}

/**
 * A brand social account as returned by `GET /admin/social-accounts`. The
 * password is intentionally absent — it is only available through the audited
 * reveal endpoint.
 */
export interface SocialAccount {
  id: string;
  platform: string;
  platformLabel: string;
  title: string;
  username: string;
  email: string | null;
  phone: string | null;
  url: string | null;
  notes: string | null;
  isActive: boolean;
  hasPassword: boolean;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccountsPayload {
  items: SocialAccount[];
  platforms: SocialPlatformMeta[];
}
