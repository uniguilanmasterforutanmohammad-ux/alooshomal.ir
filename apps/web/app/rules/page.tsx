import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  BookOpen,
  IdCard,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'قوانین سایت',
  description:
    'شرایط و قوانین استفاده از شمالی کارت؛ ساخت کارت ویزیت و بیولینک، انتشار محتوا، تأیید مدیر، تبلیغات و امتیازها.',
  alternates: { canonical: '/rules' },
};

/**
 * Public «قوانین» page. It mirrors how the platform actually works (content is
 * reviewed before publishing, boosts/ads are paid and time-limited, points come
 * from approved news, etc.) so visitors know the do's and don'ts before signing
 * up. Kept as static content — the rules only change with a code change.
 */

interface RuleSection {
  icon: typeof BookOpen;
  title: string;
  items: string[];
}

const SECTIONS: RuleSection[] = [
  {
    icon: UserRound,
    title: '۱. حساب کاربری',
    items: [
      'برای ساخت کارت ویزیت و بیولینک باید با شماره موبایل یا ایمیل ثبت‌نام کنید.',
      'هر شماره موبایل و هر ایمیل فقط می‌تواند به یک حساب کاربری تعلق داشته باشد.',
      'مسئولیت حفظ رمز عبور و امنیت حساب بر عهده‌ی خود شماست؛ اگر رمزتان لو رفت، بی‌درنگ آن را تغییر دهید.',
      'ساخت حساب به نام شخص دیگر یا با اطلاعات نادرست مجاز نیست.',
    ],
  },
  {
    icon: IdCard,
    title: '۲. ساخت کارت ویزیت و بیولینک',
    items: [
      'اطلاعاتی که وارد می‌کنید باید واقعی، دقیق و مربوط به خودتان یا کسب‌وکارتان باشد.',
      'هر بیولینک باید به یک کارت ویزیت یا حساب کاربری مشخص تعلق داشته باشد.',
      'قالب و رنگ را آزادانه انتخاب می‌کنید، ولی محتوای کارت نباید مروج خشونت، توهین یا محتوای غیرقانونی باشد.',
      'رعایت سهمیه‌ی پلن انتخابی (تعداد کارت و بیولینک) الزامی است؛ برای ظرفیت بیشتر می‌توانید اشتراک خود را ارتقا دهید.',
    ],
  },
  {
    icon: BadgeCheck,
    title: '۳. بررسی و تأیید مدیر',
    items: [
      'هر کارت ویزیت، بیولینک، پست و خبر پس از ثبت در صف بررسی قرار می‌گیرد و تنها بعد از تأیید مدیر عمومی می‌شود.',
      'در صورت رد شدن، دلیل آن ثبت می‌شود؛ پس از اصلاح می‌توانید دوباره برای بررسی ارسال کنید.',
      'ویرایش یک مورد تأییدشده، آن را به صف بررسی بازمی‌گرداند تا نسخه‌ی منتشرشده همیشه معتبر بماند.',
      'تلاش برای دور زدن بررسی یا انتشار پیش از تأیید مجاز نیست.',
    ],
  },
  {
    icon: Sparkles,
    title: '۴. محتوای مجاز و غیرمجاز',
    items: [
      'انتشار محتوای مرتبط با شغل، خدمات و کسب‌وکار شما آزاد است.',
      'انتشار محتوای غیرقانونی، توهین‌آمیز، خشونت‌طلبانه، مجرمانه یا ناقض حقوق دیگران ممنوع است.',
      'استفاده از نام، نشان و اطلاعات اشخاص یا کسب‌وکارهای دیگر بدون اجازه ممنوع است.',
      'پیوند به سایت‌ها یا محتوای مخرب، فیشینگ و کلاهبرداری ممنوع است.',
      'مدیر می‌تواند هر موردی را که این شرایط را نقض کند حذف کند.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '۵. تأیید و تبلیغ (پله و تبلیغات)',
    items: [
      '«پله» و تبلیغات خدمات پولی و زمان‌دارند و پس از تأیید مدیر فعال می‌شوند.',
      'پس از پایان زمان، مورد تبلیغ‌شده به ترتیب عادی برمی‌گردد.',
      'تبلیغ باید با محتوای اصلی کارت / بیولینک شما مرتبط باشد و گمراه‌کننده نباشد.',
      'هزینه‌ی پرداختی برای پله و تبلیغات پس از تأیید، بازگشت‌پذیر نیست.',
    ],
  },
  {
    icon: BookOpen,
    title: '۶. امتیازها',
    items: [
      'امتیاز از تأییدشدن خبرها توسط شهروندان خبرنگار به دست می‌آید.',
      'امتیازها را می‌توانید به اشتراک یا تبلیغ رایگان تبدیل کنید.',
      'انتقال امتیاز بین حساب‌ها یا خرید و فروش امتیاز مجاز نیست.',
    ],
  },
  {
    icon: AlertTriangle,
    title: '۷. مسئولیت محتوا',
    items: [
      'مسئولیت درستی و قانونی‌بودن محتوای منتشرشده بر عهده‌ی نویسنده‌ی آن است.',
      'شمالی کارت تنها بستر انتشار است و مسئولیتی در قبال صحت محتوای کاربران ندارد.',
      'شمالی کارت می‌تواند برای حفظ سلامت پلتفرم، شرایط را تغییر دهد.',
    ],
  },
  {
    icon: Ban,
    title: '۸. تخطی از قوانین',
    items: [
      'در صورت نقض قوانین، ابتدا به کاربر تذکر داده می‌شود.',
      'در تکرار تخلف، حساب کاربری موقتاً یا دائماً غیرفعال می‌شود.',
      'تلاش برای سوءاستفاده از امکانات (مثل رأی یا امتیاز) باعث محدود شدن حساب می‌شود.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '۹. حریم خصوصی',
    items: [
      'برای ثبت رویداد اسکن کارت و بیولینک، فقط شناسه‌ی ناشناس و IP هش‌شده ذخیره می‌شود؛ نه اطلاعات هویتی شما.',
      'شماره موبایل شما فقط برای ورود و اطلاع‌رسانی استفاده می‌شود.',
      'شما می‌توانید کارت‌ها، بیولینک‌ها و اطلاعات خود را هر زمان از پنل کاربری حذف یا ویرایش کنید.',
      'اطلاعات شما بدون اجازه در اختیار دیگران قرار نمی‌گیرد.',
    ],
  },
];

export default function RulesPage() {
  return (
    <>
      <Header />
      <main className="container-page py-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-brand-light px-4 py-1.5 text-xs font-bold text-brand">
            <ShieldCheck className="size-4" aria-hidden />
            شرایط و قوانین
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-ink">قوانین سایت</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
            برای اینکه شمالی کارت یک فضای امن و قابل‌اعتماد برای همه باشد، لطفاً پیش از
            استفاده این قوانین را بخوانید. با استفاده از سایت، شما این شرایط را می‌پذیرید.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title} className="indeed-panel p-6">
              <div className="flex items-center gap-3">
                <span className="vintage-avatar flex size-11 items-center justify-center">
                  <section.icon className="size-5" aria-hidden />
                </span>
                <h2 className="text-base font-extrabold text-ink">{section.title}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm leading-7 text-muted">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="indeed-panel mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-base font-extrabold text-ink">سؤالی درباره‌ی قوانین دارید؟</h2>
            <p className="mt-1 text-sm text-muted">
              از طریق تیکت پشتیبانی با ما در تماس باشید.
            </p>
          </div>
          <Link
            href="/dashboard/tickets"
            className="indeed-btn indeed-btn-secondary py-2 text-sm"
          >
            ثبت تیکت پشتیبانی
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
