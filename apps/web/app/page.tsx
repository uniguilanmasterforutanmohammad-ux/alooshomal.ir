import Link from 'next/link';
import './hero-brick.css';
import './site-bg-pattern.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PulseSection } from '@/components/news/PulseSection';
import { BlogSection } from '@/components/blog/BlogSection';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import { HomeSearchBox } from '@/components/home/HomeSearchBox';
import { HomeAdBox } from '@/components/home/HomeAdBox';
import { HomeHeadline } from '@/components/home/HomeHeadline';
import {
  HomeItemSlider,
  type HomeSliderItem,
} from '@/components/home/HomeItemSlider';
import {
  BadgeCheck,
  QrCode,
  Smartphone,
  Sparkles,
} from 'lucide-react';

const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000/api';

/** Fetch the home-page sliders (6 latest cards / biolinks) server-side. */
async function getLatest(path: string): Promise<HomeSliderItem[]> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: HomeSliderItem[] };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

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

export default async function HomePage() {
  // The admin can stop any public section; each one then drops out of the home
  // page too (sliders, hero buttons, ad banner, news table) and the site-wide
  // notice bar explains why.
  const stopped = await getStoppedSections();
  const showCards = !isRouteStopped(stopped, '/business-cards');
  const showBiolinks = !isRouteStopped(stopped, '/biolinks');
  const showNews = !isRouteStopped(stopped, '/pulse');
  const showBlog = !isRouteStopped(stopped, '/blog');
  const showHomeAds = !stopped.some((section) => section.homeBox);
  // Both sliders are fetched in parallel; a failed fetch just hides its slider.
  const [latestCards, latestBiolinks] = await Promise.all([
    showCards ? getLatest('/business-cards/public/latest?limit=6') : Promise.resolve([]),
    showBiolinks ? getLatest('/biolinks/public/latest?limit=6') : Promise.resolve([]),
  ]);

  return (
    <>
      <Header />

      <main>
        {/* Full first-screen hero: on every device only the coloured
            background, the city line, the search box and its two buttons are
            visible before scrolling. */}
        <section className="home-hero home-hero-brick bg-brand text-white">
          <div className="container-page relative z-[1] mx-auto w-full max-w-3xl py-10 text-center">
            <HomeHeadline />
            <p className="mt-5 text-xl font-extrabold leading-relaxed text-white drop-shadow-sm sm:text-2xl md:text-3xl">
              در شهرهای{' '}
              <span className="whitespace-nowrap">تنکابن</span>
              {'، '}
              <span className="whitespace-nowrap">شیرود</span>
              {' و '}
              <span className="whitespace-nowrap">رامسر</span>
            </p>
            <HomeSearchBox />
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
              {showCards ? (
                <Link
                  href="/business-cards"
                  className="indeed-btn border-white text-white hover:bg-white/10"
                >
                  <BadgeCheck className="size-4" aria-hidden />
                  لیست کارت ویزیت‌ها
                </Link>
              ) : null}
              {showBiolinks ? (
                <Link
                  href="/biolinks"
                  className="indeed-btn border-white text-white hover:bg-white/10"
                >
                  <Smartphone className="size-4" aria-hidden />
                  لیست بیولینک‌ها
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* Order requested for the home page, right below the search box and its
            two buttons: ads → latest business cards → latest biolinks → city
            news → the rest of the page. */}
        {showHomeAds ? <HomeAdBox /> : null}

        {showCards ? (
          <HomeItemSlider
            kind="business-cards"
            items={latestCards}
            moreHref="/business-cards"
          />
        ) : null}

        {showBiolinks ? (
          <HomeItemSlider
            kind="biolinks"
            items={latestBiolinks}
            moreHref="/biolinks"
          />
        ) : null}

        {/* «شهروند خبرنگار شوید» sits directly above «اخبار شهر» so the
            invitation to file news leads straight into the news table. */}
        {showNews ? (
        <section className="container-page mt-10 sm:mt-16">
          <div className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-base font-extrabold text-ink">شهروند خبرنگار شوید</h2>
              <p className="mt-1 text-sm text-muted">
                خبرهای شهر خود را ثبت کنید تا پس از تأیید مدیر در «اخبار شهر» منتشر شود.
                {' '}با تأیید هر خبر، امتیاز بگیرید و آن را صرف اشتراک و تبلیغ کنید.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ReporterCtaButton variant="primary" />
              <Link href="/dashboard/points" className="indeed-btn indeed-btn-secondary py-2 text-sm">
                مشاهده امتیازها
              </Link>
            </div>
          </div>
        </section>
        ) : null}

        {showNews ? <PulseSection /> : null}

        {showBlog ? <BlogSection /> : null}

        <section className="container-page mt-10 sm:mt-16">
          {/* لایه رنگی پشت شیشه تا افکت Liquid Glass دیده شود */}
          <div className="relative isolate overflow-hidden rounded-3xl p-3 sm:p-6">
            <div className="pointer-events-none absolute -top-16 -right-10 -z-10 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-0 -z-10 h-72 w-72 rounded-full bg-amber-300/50 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 left-1/3 -z-10 h-56 w-56 rounded-full bg-rose-300/40 blur-3xl" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/25 p-6 text-ink backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(31,38,135,0.15),inset_0_1px_1px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(255,255,255,0.2)] transition duration-500 hover:-translate-y-1 hover:bg-white/35 hover:shadow-[0_20px_50px_rgba(31,38,135,0.22),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                >
                  {/* بازتاب نور روی سطح شیشه */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent opacity-70" />
                  <span className="relative flex size-12 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-brand shadow-inner backdrop-blur-md transition group-hover:scale-110">
                    <feature.icon className="size-6" aria-hidden />
                  </span>
                  <h2 className="relative mt-4 text-base font-extrabold">{feature.title}</h2>
                  <p className="relative mt-2 text-sm leading-7 text-ink/70">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-page mt-10 sm:mt-16">
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
      </main>

      <Footer />
    </>
  );
}
