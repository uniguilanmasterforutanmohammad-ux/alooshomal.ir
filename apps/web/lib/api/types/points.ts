export type RewardKind = 'SUBSCRIPTION' | 'AD_HOME' | 'AD_DIRECTORY';

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  kind: RewardKind;
  points: number;
  planId: string | null;
  plan?: { id: string; name: string } | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  pointsSpent: number;
  detail: string | null;
  createdAt: string;
  reward?: { id: string; title: string };
  user?: { id: string; email: string | null; fullName: string | null };
}

export interface PointsSummary {
  balance: number;
  ledger: PointsLedgerEntry[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  pointsPerNews: number;
}

export interface AdminPointsOverview {
  topUsers: Array<{
    id: string;
    email: string | null;
    fullName: string | null;
    pointsBalance: number;
  }>;
  redemptions: RewardRedemption[];
  rewardCount: number;
}

// ---------------------------------------------------------------------------
//  «فیدها» (feed)
