'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

import { aparatEmbedUrl, aparatWatchUrl } from '@/lib/blog';

/**
 * Aparat video embed. Shows a lightweight poster with a play button first, and
 * swaps in the direct iframe on click — so the heavy Aparat player only loads
 * when the visitor actually wants it (keeps the page fast).
 */
export function BlogVideoPlayer({
  videoId,
  title,
  cover,
}: {
  videoId: string;
  title: string;
  cover?: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--vintage-border)] bg-black">
        <iframe
          src={aparatEmbedUrl(videoId)}
          title={title}
          className="absolute inset-0 size-full"
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--vintage-border)] bg-[#2a1a12]"
      aria-label={`پخش ویدیو: ${title}`}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-60 transition group-hover:opacity-75"
        />
      ) : null}
      <span className="relative flex size-16 items-center justify-center rounded-full bg-brand/90 text-white shadow-lg transition group-hover:scale-105">
        <Play className="ms-1 size-7" aria-hidden />
      </span>
      <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
        پخش از آپارات
      </span>
    </button>
  );
}

/** A compact Aparat link, for places where only a link is wanted. */
export function AparatLink({ videoId }: { videoId: string }) {
  return (
    <a
      href={aparatWatchUrl(videoId)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-bold text-brand hover:underline"
    >
      مشاهده در آپارات
    </a>
  );
}
