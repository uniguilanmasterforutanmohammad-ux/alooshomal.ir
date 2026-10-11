import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const biolinkStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار تأیید مدیر',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  UNPUBLISHED: 'منتشرنشده',
};

export const biolinkStatusStyles: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  UNPUBLISHED: 'bg-slate-100 text-slate-600 border-slate-200',
};
