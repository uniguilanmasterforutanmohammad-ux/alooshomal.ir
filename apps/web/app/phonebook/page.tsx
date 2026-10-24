import type { Metadata } from 'next';

import { PhonebookNotebook } from './PhonebookNotebook';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
 * Public «دفترچه تلفن» page. The whole contact list is fetched server-side so
 * the first paint already carries the real rows (crawlable content), then the
 * client notebook takes over for search, bookmarking and page flipping.
 */
export default async function PhonebookPage() {
  const entries = await fetchPhonebook();

  return (
    <>
      <Header />
      <main>
        <PhonebookNotebook initialEntries={entries} />
      </main>
      <Footer />
    </>
  );
}
