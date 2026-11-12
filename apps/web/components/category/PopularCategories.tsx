import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { categoryIcon } from '@/lib/category-icons';
import { fa } from '@/lib/jalali';
import type { BusinessCategorySummary } from '@/lib/api';

interface Props {
  categories: BusinessCategorySummary[];
  /** Link shown at the end of the heading (`/categories` by default). */
  moreHref?: string | null;
  moreLabel?: string;
  /** Show the per-category business count under the name. */
  showCounts?: boolean;
  /** Optional heading override (the categories page reuses the grid alone). */
  title?: string | null;
}

/**
 * «دسته‌بندی‌های محبوب» — the reference's icon grid: four columns on phones,
 * six on tablets and eight on desktop, each tile a 48px tinted square with a
 * 24px icon and an 11px label. Used on the home page and the /categories page.
 */
export function PopularCategories({
  categories,
  moreHref = '/categories',
  moreLabel = 'همه دسته‌بندی‌ها',
  showCounts = false,
  title = 'دسته‌بندی‌های محبوب',
}: Props) {
  if (categories.length === 0) return null;

  return (
    <section className="footer-palette">
      {title ? (
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-base font-bold leading-8 text-[var(--footer-ink)]">
            {title}
          </h2>
          {moreHref ? (
            <Link
              href={moreHref}
              prefetch={false}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--footer-brand-light)] transition hover:text-[var(--footer-brand)]"
            >
              {moreLabel}
              <ChevronLeft className="size-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-8">
        {categories.map((category) => {
          const Icon = categoryIcon(category.name);
          return (
            <Link
              key={category.id}
              href={`/categories/${encodeURIComponent(category.name)}`}
              prefetch={false}
              className="group flex flex-col items-center gap-1.5 text-[var(--footer-brand-light)]"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--footer-brand-pale)] transition group-hover:bg-[var(--footer-brand)] group-hover:text-[var(--footer-on-brand)]">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="text-center text-[11px] font-semibold leading-5 text-[var(--footer-muted)] transition group-hover:text-[var(--footer-brand)]">
                {category.name}
              </span>
              {showCounts ? (
                <span className="text-center text-[10px] leading-4 text-[var(--footer-faint)]">
                  {fa(category.count)} کسب‌وکار
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
