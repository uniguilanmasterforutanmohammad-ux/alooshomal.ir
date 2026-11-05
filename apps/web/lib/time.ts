/**
 * Persian-friendly time helpers shared by the social-style public pages
 * (`/feeds`, `/pulse`, `/blog`). They keep the "relative time" wording in one
 * place so a post and a news item never say the same moment differently.
 */

/** «۳ ساعت»، «۲ روز»، «همین حالا» … falling back to the Jalali date after a week. */
export function faRelativeTime(value: string): string {
  const date = new Date(value);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${minutes.toLocaleString('fa-IR')} دقیقه`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days.toLocaleString('fa-IR')} روز`;
  return date.toLocaleDateString('fa-IR');
}

/** Full Jalali date, or an empty string for a missing value. */
export function faDate(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fa-IR');
}

/** Exact Jalali date + time, used in `title` tooltips. */
export function faDateTime(value: string): string {
  return new Date(value).toLocaleString('fa-IR');
}
