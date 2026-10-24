import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'دفترچه تلفن شهر',
  description:
    'دفترچه تلفن عمومی شهر: شماره تماس کارت ویزیت‌های منتشرشده (تنکابن، شیرود و رامسر) در نمایش «دفترچه» دایرکتوری کارت ویزیت‌ها.',
  alternates: { canonical: '/business-cards?view=notebook' },
};

/**
 * «دفترچه تلفن» now lives inside `/business-cards` as its third display mode.
 * This route only keeps old links working — it permanently redirects to the
 * notebook view of the directory (see `next.config.ts` / this page's redirect).
 */
export default function PhonebookPage() {
  redirect('/business-cards?view=notebook&sort=alpha');
}
