'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

/** Digikala-style gallery: big image plus clickable thumbnails. */
export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="indeed-panel flex flex-col gap-3 p-4">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-[var(--vintage-paper)]">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={title}
            className="size-full object-contain"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-sm text-muted">
            بدون تصویر
          </span>
        )}
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`تصویر ${index + 1}`}
              className={cn(
                'aspect-square overflow-hidden rounded-lg border bg-[var(--vintage-paper)] transition',
                index === active
                  ? 'border-brand ring-2 ring-brand/30'
                  : 'border-[var(--vintage-border)] hover:border-brand/50',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
