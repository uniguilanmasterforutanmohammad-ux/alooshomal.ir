import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Palette used for the deterministic initials avatars across the site. */
export const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

/**
 * Stable accent for an initials avatar, keyed off an id (user, category, …):
 * the same seed always yields the same colour, so a person/row keeps its hue
 * between renders and pages.
 */
export function accentColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const biolinkStatusLabels: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING: 'در انتظار تأیید مدیر',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  UNPUBLISHED: 'منتشرنشده',
};

export const biolinkStatusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  UNPUBLISHED: 'bg-slate-100 text-slate-600 border-slate-200',
};
