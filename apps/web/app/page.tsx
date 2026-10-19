import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PulseSection } from '@/components/news/PulseSection';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
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
  // Both sliders are fetched in parallel; a failed fetch just hides its slider.
  const [latestCards, latestBiolinks] = await Promise.all([
    getLatest('/business-cards/public/latest?limit=6'),
    getLatest('/biolinks/public/latest?limit=6'),
  ]);

  return (
    <>
      <Header />

      <main>
        {/* Full first-screen hero: on every device only the coloured
            background, the city line, the search box and its two buttons are
            visible before scrolling. */}
        <section className="home-hero bg-brand text-white">
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
              <Link
                href="/business-cards"
                className="indeed-btn border-white text-white hover:bg-white/10"
              >
                <BadgeCheck className="size-4" aria-hidden />
                لیست کارت ویزیت‌ها
              </Link>
              <Link
                href="/biolinks"
                className="indeed-btn border-white text-white hover:bg-white/10"
              >
                <Smartphone className="size-4" aria-hidden />
                لیست بیولینک‌ها
              </Link>
            </div>
          </div>
        </section>

        {/* Order requested for the home page, right below the search box and its
            two buttons: ads → latest business cards → latest biolinks → city
            news → the rest of the page. */}
        <HomeAdBox />

        <HomeItemSlider
          kind="business-cards"
          items={latestCards}
          moreHref="/business-cards"
        />

        <HomeItemSlider
          kind="biolinks"
          items={latestBiolinks}
          moreHref="/biolinks"
        />

        {/* «شهروند خبرنگار شوید» sits directly above «اخبار شهر» so the
            invitation to file news leads straight into the news table. */}
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

        <PulseSection />

        <section className="container-page mt-10 sm:mt-16">
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
