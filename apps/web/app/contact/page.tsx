import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  LifeBuoy,
  Mail,
  MessageCircleQuestion,
  ScrollText,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description:
    'راه‌های ارتباط با تیم شمالی کارت: ثبت تیکت پشتیبانی، مطالعه‌ی راهنما و قوانین سایت.',
  alternates: { canonical: '/contact' },
};

/**
 * Public «تماس با ما» page. The official support channel is the ticket system
 * (always available — support/contact is exempt from the feature switches), so
 * this page points visitors there and to the self-service guide/rules instead
 * of inventing phone numbers or email addresses.
 */
export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="container-page py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-brand-light px-4 py-1.5 text-xs font-bold text-brand">
            <Mail className="size-4" aria-hidden />
            ارتباط با ما
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-ink">تماس با شمالی کارت</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
            سؤال، پیشنهاد یا مشکلی دارید؟ برای پاسخ فوری از دکمه‌ی «پشتیبانی
            آنلاین» (پایین صفحه) گفتگوی زنده را شروع کنید؛ تیم پشتیبانی همان
            لحظه پاسخ می‌دهد. برای درخواست‌های جزئی‌تر هم می‌توانید تیکت ثبت
            کنید.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/support"
              className="indeed-btn indeed-btn-primary py-2 text-sm"
            >
              <MessageCircleQuestion className="size-4" aria-hidden />
              گفتگوی آنلاین با پشتیبانی
            </Link>
            <Link
              href="/dashboard/tickets"
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
            >
              <LifeBuoy className="size-4" aria-hidden />
              ثبت تیکت
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <section className="indeed-panel flex flex-col p-6">
            <span className="vintage-avatar flex size-11 items-center justify-center">
              <LifeBuoy className="size-5" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-extrabold text-ink">تیکت پشتیبانی</h2>
            <p className="mt-2 flex-1 text-sm leading-7 text-muted">
              کانال رسمی ارتباط با مدیران و تیم پشتیبانی. تیکت‌ها همیشه در دسترس
              هستند و پس از ورود به حساب، تاریخچه‌ی مکالمه‌ها را می‌بینید.
            </p>
            <Link
              href="/dashboard/tickets"
              className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm"
            >
              <LifeBuoy className="size-4" aria-hidden />
              ثبت تیکت پشتیبانی
            </Link>
          </section>

          <section className="indeed-panel flex flex-col p-6">
            <span className="vintage-avatar flex size-11 items-center justify-center">
              <MessageCircleQuestion className="size-5" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-extrabold text-ink">راهنمای استفاده</h2>
            <p className="mt-2 flex-1 text-sm leading-7 text-muted">
              پاسخ بیشتر سؤال‌های رایج درباره‌ی ساخت کارت ویزیت، بیولینک، تبلیغات و
              خبرهای شهر در راهنمای گام‌به‌گام آمده است.
            </p>
            <Link
              href="/guide"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              <BookOpen className="size-4" aria-hidden />
              مطالعه‌ی راهنما
            </Link>
          </section>

          <section className="indeed-panel flex flex-col p-6">
            <span className="vintage-avatar flex size-11 items-center justify-center">
              <ScrollText className="size-5" aria-hidden />
            </span>
            <h2 className="mt-3 text-base font-extrabold text-ink">قوانین و مقررات</h2>
            <p className="mt-2 flex-1 text-sm leading-7 text-muted">
              شرایط استفاده، حریم خصوصی و قواعد انتشار محتوا را پیش از ثبت درخواست
              یا گزارش تخلف مطالعه کنید.
            </p>
            <Link
              href="/rules"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              <ScrollText className="size-4" aria-hidden />
              مشاهده‌ی قوانین
            </Link>
          </section>
        </div>

        <div className="indeed-panel mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-base font-extrabold text-ink">گزارش تخلف یا محتوای نامناسب</h2>
            <p className="mt-1 text-sm text-muted">
              اگر کارت، بیولینک یا پستی مغایر با قوانین دیدید، آن را با ذکر نشانی
              صفحه از طریق تیکت به ما گزارش دهید تا بررسی شود.
            </p>
          </div>
          <Link
            href="/dashboard/tickets"
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            گزارش از طریق تیکت
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
