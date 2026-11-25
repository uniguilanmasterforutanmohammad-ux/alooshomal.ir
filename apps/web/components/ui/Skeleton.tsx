import { cn } from '@/lib/utils';

/**
 * Shimmer placeholder used while data is loading. Purely presentational, so it
 * works in both server (`loading.tsx`) and client components.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--vintage-paper)]',
        className,
      )}
      aria-hidden
    />
  );
}

/** A generic page skeleton: title, optional nav strip and a card grid. */
export function PageSkeleton({
  cards = 6,
  withNav = false,
}: {
  cards?: number;
  withNav?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="در حال بارگذاری">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      {withNav ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-24" />
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="indeed-panel flex flex-col gap-3 p-4"
          >
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
