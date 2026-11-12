import { redirect } from 'next/navigation';

/**
 * The standalone «خدمات» page was retired: its plan cards duplicated the
 * public «تعرفه‌ها» page. Keep the route as a redirect so old bookmarks and
 * search results do not dead-end, while it no longer appears in the header,
 * footer, guide or sitemap.
 */
export default function ServicesPage() {
  redirect('/pricing');
}
