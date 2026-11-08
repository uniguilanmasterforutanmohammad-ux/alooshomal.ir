import type { NewsStatus } from '@/lib/api';

/** Tabs of the admin «فیدها» panel. */
export type Tab =
  | 'posts'
  | 'comments'
  | 'subscriptions'
  | 'packages'
  | 'topics'
  | 'settings';

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
};

export const STATUS_FILTERS: NewsStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
