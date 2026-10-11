'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Props {
  meta: PaginationMeta;
  onPage: (page: number) => void;
}

export function Pagination({ meta, onPage }: Props) {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, meta.page - 1))}
        disabled={!meta.hasPrev}
        className="indeed-btn indeed-btn-secondary py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden />
        قبلی
      </button>
      <span className="text-sm text-muted">
        صفحه {meta.page.toLocaleString('fa-IR')} از {meta.totalPages.toLocaleString('fa-IR')}
      </span>
      <button
        type="button"
        onClick={() => onPage(meta.page + 1)}
        disabled={!meta.hasNext}
        className="indeed-btn indeed-btn-secondary py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        بعدی
        <ChevronLeft className="size-4" aria-hidden />
      </button>
    </div>
  );
}
