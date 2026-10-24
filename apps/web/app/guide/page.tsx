'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  Bookmark,
  Crown,
  IdCard,
  ImagePlus,
  LifeBuoy,
  Megaphone,
  Newspaper,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth';

interface GuideStep {
  icon: typeof IdCard;
  title: string;
  desc: string;
  href: string;
  cta: string;
}

// Public «راهنمای استفاده» page: a friendly, plain-language walkthrough of every
// feature with a direct link to where each one lives, so a first-time visitor
// knows exactly where to start and what each button does.
const STEPS: GuideStep[] = [
  {
    icon: UserRound,
    title: '۱. ساخت حساب کاربری',
    desc: 'با ایمیل یا شماره موبایل ثبت‌نام کنید؛ چند ثانیه بیشتر طول نمی‌کشد و به‌صورت رایگان می‌توانید شروع کنید.',
    href: '/login',
    cta: 'ورود / ثبت‌نام',
  },
  {
    icon: BadgeCheck,
    title: '۲. ساخت کارت ویزیت دیجیتال',
    desc: 'اطلاعات تماس، شغل و شبکه‌های اجتماعی خود را وارد کنید، یک قالب دلخواه انتخاب کنید و کارت را برای تأیید ارسال کنید.',
    href: '/dashboard/business-cards',
    cta: 'کارت ویزیت‌های من',
  },
  {
    icon: IdCard,
    title: '۳. ساخت بیولینک',
    desc: 'همه‌ی لینک‌ها و راه‌های ارتباطی خود را در یک صفحه‌ی زیبا جمع کنید و لینک اختصاصی آن را همه‌جا به اشتراک بگذارید.',
    href: '/dashboard/biolinks',
    cta: 'بیولینک‌های من',
  },
  {
    icon: Users,
    title: '۴. دیده‌شدن در دایرکتوری',
    desc: 'کارت و بیولینک شما در فهرست شهر و کسب‌وکار مربوطه نمایش داده می‌شود تا مشتری‌ها راحت شما را پیدا کنند.',
    href: '/business-cards',
    cta: 'مشاهده دایرکتوری',
  },
  {
    icon: TrendingUp,
    title: '۵. افزایش بازدید (پله)',
    desc: 'با «پله» مورد خود را به صدر لیست دایرکتوری همان شهر/کسب‌وکار برسانید و بیشتر دیده شوید.',
    href: '/dashboard/boost',
    cta: 'افزایش بازدید',
  },
  {
    icon: Megaphone,
    title: '۶. تبلیغات',
    desc: 'درخواست تبلیغ در صفحه‌ی اول یا در صدر دایرکتوری بدهید؛ پس از تأیید مدیر، تبلیغ شما به نمایش درمی‌آید.',
    href: '/dashboard/boost',
    cta: 'ثبت درخواست تبلیغ',
  },
  {
    icon: ImagePlus,
    title: '۷. فیدها (پست تصویری)',
    desc: 'با خرید یک بسته‌ی فید می‌توانید پست تصویری منتشر کنید و در فید عمومی شهر دیده شوید.',
    href: '/dashboard/feeds',
    cta: 'پست‌های من',
  },
  {
    icon: Newspaper,
    title: '۸. شهروند خبرنگار',
    desc: 'درخواست نقش شهروند خبرنگار بدهید تا بتوانید خبرهای شهر را در «نبض شهر» ثبت کنید.',
    href: '/pulse',
    cta: 'نبض شهر',
  },
  {
    icon: Bookmark,
    title: '۹. ذخیره‌شده‌های من',
    desc: 'کارت‌ها، بیولینک‌ها و فیدهایی که ذخیره کرده‌اید از این بخش در دسترس‌اند.',
    href: '/dashboard/saved',
    cta: 'ذخیره‌شده‌ها',
  },
  {
    icon: Crown,
    title: '۱۰. اشتراک و ارتقا',
    desc: 'با ارتقای اشتراک، سهمیه‌ی ساخت کارت و بیولینک بیشتر می‌شود و امکانات نمایشی ویژه فعال می‌گردد.',
    href: '/services',
    cta: 'لیست خدمات و اشتراک‌ها',
  },
  {
    icon: Sparkles,
    title: '۱۱. امتیاز و جوایز',
    desc: 'با فعالیت و تأیید خبرها امتیاز بگیرید و امتیازها را به اشتراک یا تبلیغ رایگان تبدیل کنید.',
    href: '/dashboard/points',
    cta: 'امتیاز من',
  },
  {
    icon: LifeBuoy,
    title: '۱۲. پشتیبانی',
    desc: 'اگر سؤالی داشتید یا به کمک نیاز داشتید، از طریق تیکت‌های پشتیبانی با ما در تماس باشید.',
    href: '/dashboard/tickets',
    cta: 'تیکت‌های پشتیبانی',
  },
];

export default function GuidePage() {
  const { token, hydrated } = useAuth();
  const dashboardHref = hydrated && token ? '/dashboard' : '/login';

  return (
    <>
      <Header />
      <main className="container-page py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-brand-light px-4 py-1.5 text-xs font-bold text-brand">
            <Rocket className="size-4" aria-hidden />
            راهنمای استفاده
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-ink">شمالی کارت چطور کار می‌کند؟</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
            در چند گام ساده یاد می‌گیرید چطور کارت ویزیت و بیولینک بسازید، در
            دایرکتوری دیده شوید، تبلیغ بگیرید و خبرهای شهر را منتشر کنید. روی هر گام
            بزنید تا مستقیم به همان بخش بروید.
          </p>
          <Link
            href={dashboardHref}
            className="indeed-btn indeed-btn-primary mt-6 py-2.5 text-sm"
          >
            <Rocket className="size-4" aria-hidden />
            {hydrated && token ? 'رفتن به پنل کاربری' : 'شروع رایگان'}
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="indeed-panel flex flex-col p-5">
              <span className="vintage-avatar flex size-11 items-center justify-center">
                <step.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-base font-extrabold text-ink">{step.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-7 text-muted">{step.desc}</p>
              <Link
                href={step.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
              >
                {step.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="indeed-panel mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="vintage-avatar flex size-11 items-center justify-center">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink">هنوز سؤالی دارید؟</h2>
              <p className="text-sm text-muted">
                تیم پشتیبانی آماده‌ی پاسخ‌گویی به شماست.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/tickets"
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            <LifeBuoy className="size-4" aria-hidden />
            ثبت تیکت پشتیبانی
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
