import { redirect } from 'next/navigation';

/**
 * The business panel opens on the «کارت‌های ویزیت» tab. Workspace management
 * (adding/removing businesses and buying modules) lives at
 * `/dashboard/business/overview` and is linked from the panel nav.
 */
export default function BusinessPanelIndexPage() {
  redirect('/dashboard/business/cards');
}
