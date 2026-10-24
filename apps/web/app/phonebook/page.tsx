import type { Metadata } from 'next';

import { PhonebookNotebook } from './PhonebookNotebook';
import { Header } from '@/components/layout/Header';
import { fetchPhonebook } from '@/lib/directory-server';
import './phonebook.css';

export const metadata: Metadata = {
  title: 'دفترچه تلفن شهر',
  description:
    'دفترچه تلفن عمومی شهر: شماره تماس کارت ویزیت‌های منتشرشده (تنکابن، شیرود و رامسر) با جستجوی سریع و امکان ذخیره‌ی مخاطبین.',
  alternates: { canonical: '/phonebook' },
  openGraph: {
    type: 'website',
    title: 'دفترچه تلفن شهر | شمالی کارت',
    description:
      'شماره تماس کارت ویزیت‌های منتشرشده را یک‌جا ببینید و در دفترچه‌ی خود ذخیره کنید.',
    url: '/phonebook',
  },
};

/**
 * Public «دفترچه تلفن» page. The first page of contacts is fetched
 * server-side so the first paint already carries real, crawlable rows, then
 * the client notebook takes over and keeps infinite-scrolling the list.
 */
export default async function PhonebookPage() {
  const initialData = await fetchPhonebook({ sort: 'alpha' });

  return (
    <>
      <Header />
      {/* The footer is intentionally omitted so the notebook shell can fill the
          viewport exactly and only the contact list scrolls (see
          `.directory-shell` in globals.css). */}
      <PhonebookNotebook initialData={initialData} />
    </>
  );
}
