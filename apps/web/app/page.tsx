import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PulseSection } from '@/components/news/PulseSection';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
import { HomeSearchBox } from '@/components/home/HomeSearchBox';
import {
  BadgeCheck,
  Link2,
  QrCode,
  Smartphone,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'ساخت بیولینک در چند دقیقه',
    text: 'اطلاعات حرفه‌ای خود را وارد کنید، قالب و رنگ را انتخاب کنید و بیولینک آماده است.',
  },
  {
    icon: QrCode,
    title: 'لینک و QR اختصاصی',
    text: 'برای هر بیولینک یک لینک یکتا و QR قابل دانلود تولید می‌شود.',
  },
  {
    icon: Smartphone,
    title: 'مشاهده بدون نصب برنامه',
    text: 'مخاطب با مرورگر موبایل بیولینک را می‌بیند و در مخاطبین ذخیره می‌کند.',
  },
  {
    icon: BadgeCheck,
    title: 'تأیید مدیر پیش از انتشار',
    text: 'هر بیولینک پس از ثبت در صف بررسی قرار می‌گیرد و تنها بعد از تأیید منتشر می‌شود.',
  },
  {
    icon: Sparkles,
    title: 'کارت ویزیت دیجیتال',
    text: 'در کنار بیولینک، کارت ویزیت دیجیتال هم بساز؛ با ۱۵ تم آماده و لینک اختصاصی.',
  },
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        <section className="bg-brand py-16 text-white md:py-20">
          <div className="container-page mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold leading-snug md:text-4xl">
              بیولینک دیجیتال شما، آماده برای اشتراک‌گذاری
            </h1>
            <p className="mt-4 text-base leading-8 text-white/90">
              اطلاعات حرفه‌ای‌ات را یک‌بار وارد کن و در رویدادها تنها با یک QR یا لینک
              به اشتراک بگذار. بدون نیاز به نصب برنامه برای مخاطب.
            </p>
            <HomeSearchBox />
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="indeed-btn bg-white text-brand hover:bg-white/90"
              >
                <UserPlus className="size-4" aria-hidden />
                ساخت بیولینک رایگان
              </Link>
              <Link
                href="/login"
                className="indeed-btn border-white text-white hover:bg-white/10"
              >
                <Link2 className="size-4" aria-hidden />
                ورود به حساب
              </Link>
              <Link
                href="/biolinks"
                className="indeed-btn border-white text-white hover:bg-white/10"
              >
                <Users className="size-4" aria-hidden />
                دایرکتوری بیولینک‌ها
              </Link>
              <Link
                href="/business-cards"
                className="indeed-btn border-white text-white hover:bg-white/10"
              >
                <Users className="size-4" aria-hidden />
                دایرکتوری کارت ویزیت
              </Link>
            </div>
          </div>
        </section>

        <section className="container-page -mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="indeed-panel p-5">
                <feature.icon className="size-7 text-brand" aria-hidden />
                <h2 className="mt-3 text-base font-extrabold text-ink">{feature.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-page mt-8">
          <div className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-base font-extrabold text-ink">شهروند خبرنگار شوید</h2>
              <p className="mt-1 text-sm text-muted">
                خبرهای شهر خود را ثبت کنید تا پس از تأیید مدیر در «نبض شهر» منتشر شود.
              </p>
            </div>
            <ReporterCtaButton variant="primary" />
          </div>
        </section>

        <section className="container-page mt-16">
          <div className="indeed-panel p-8">
            <h2 className="text-xl font-extrabold text-ink">چطور کار می‌کند؟</h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              <li>
                <span className="text-3xl font-extrabold text-brand-light">۱</span>
                <p className="mt-2 font-bold">ثبت‌نام کنید</p>
                <p className="text-sm text-muted">
                  با شماره موبایل حساب بسازید؛ در همان صفحه می‌توانید رمز عبور هم بگذارید.
                </p>
              </li>
              <li>
                <span className="text-3xl font-extrabold text-brand-light">۲</span>
                <p className="mt-2 font-bold">بیولینک را بسازید</p>
                <p className="text-sm text-muted">
                  فیلدهای حرفه‌ای را پر کنید و ظاهر بیولینک را تنظیم کنید.
                </p>
              </li>
              <li>
                <span className="text-3xl font-extrabold text-brand-light">۳</span>
                <p className="mt-2 font-bold">منتشر و به اشتراک بگذارید</p>
                <p className="text-sm text-muted">
                  پس از تأیید مدیر، لینک و QR بیولینک فعال می‌شود.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <PulseSection />
      </main>

      <Footer />
    </>
  );
}
