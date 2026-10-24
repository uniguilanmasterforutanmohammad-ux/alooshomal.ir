/**
 * «بلاگ» helpers. The video is embedded as a direct Aparat iframe
 * (`aparat.com/video/video/embed/videohash/<id>/vt/frame`), which plays inline
 * without an extra wrapper page or ads.
 */

/** The direct Aparat embed URL for a video hash. */
export function aparatEmbedUrl(videoId: string): string {
  return `https://www.aparat.com/video/video/embed/videohash/${encodeURIComponent(
    videoId,
  )}/vt/frame`;
}

/** The canonical Aparat watch page for a video hash. */
export function aparatWatchUrl(videoId: string): string {
  return `https://www.aparat.com/v/${encodeURIComponent(videoId)}`;
}

/**
 * A stable accent hue per post, so blog cards keep the site's warm palette
 * while still feeling varied (like the directory tints).
 */
const BLOG_ACCENTS = ['#b8693a', '#8a5a2b', '#7c6a3c', '#9a4a22', '#6d5b8a', '#2f6d64'];

export function blogAccent(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return BLOG_ACCENTS[hash % BLOG_ACCENTS.length];
}

/** Persian read-time estimate (~200 words/min) for a post body. */
export function blogReadMinutes(content: string | null): number {
  const words = (content ?? '')
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
