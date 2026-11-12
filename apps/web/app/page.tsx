import Link from 'next/link';
import './hero-brick.css';
import './site-bg-pattern.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import { HomeSearchBox } from '@/components/home/HomeSearchBox';
import { HomeHeadline } from '@/components/home/HomeHeadline';
import { HomeBusinessSections } from '@/components/home/HomeBusinessSections';
import { fetchHomeBusinessCards, splitHomeBusinessCards } from '@/lib/home-server';
import { BadgeCheck, BriefcaseBusiness, Smartphone } from 'lucide-react';

/**
 * Public home page: the hero stays the first screen (headline, city line,
 * search box and directory/category buttons), followed by the two rails in the
 * footer palette — «پیشنهاد شمالی کارت» and «کسب‌وکارهای تازه». The rest of
 * the old home widgets (ads, city news, blog picks, guides) remain removed.
 */
export default async function HomePage() {
  // The admin can stop any public section; the hero buttons then drop out too
  // and the site-wide notice bar explains why.
  const stopped = await getStoppedSections();
  const showCards = !isRouteStopped(stopped, '/business-cards');
  const showBiolinks = !isRouteStopped(stopped, '/biolinks');
  const businessCards = showCards ? await fetchHomeBusinessCards(12) : [];
  const { suggested, latest } = splitHomeBusinessCards(businessCards);

  return (
    /* The shell reserves the height left by the chrome — the 66px sticky
       header on desktop — plus the sticky «توقف موقت» notice strip when one is
       showing (`--feature-notice-h`), so a sparse page still pins the footer to
       the bottom. The hero occupies the first screen; the two rails follow. */
    <div className="home-shell flex min-h-[calc(100dvh-var(--feature-notice-h))] flex-col lg:min-h-[calc(100dvh-66px-var(--feature-notice-h))]">
      <Header />

      <main className="flex flex-1 flex-col">
        {/* Full first-screen hero: on every device only the coloured
            background, the city line, the search box and its two buttons are
            visible before scrolling. */}
        <section className="home-hero home-hero-brick bg-brand text-white">
          <div className="container-page relative z-[1] mx-auto w-full max-w-3xl py-3 text-center sm:py-10">
            <HomeHeadline />
            <p className="mt-4 text-lg font-extrabold leading-relaxed text-white drop-shadow-sm sm:mt-5 sm:text-2xl md:text-3xl">
              در شهرهای{' '}
              <span className="whitespace-nowrap">تنکابن</span>
              {'، '}
              <span className="whitespace-nowrap">شیرود</span>
              {' و '}
              <span className="whitespace-nowrap">رامسر</span>
            </p>
            <HomeSearchBox />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
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
              {showCards ? (
                <Link
                  href="/categories"
                  className="indeed-btn border-white text-white hover:bg-white/10"
                >
                  <BriefcaseBusiness className="size-4" aria-hidden />
                  دسته‌بندی مشاغل
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {showCards ? (
          <HomeBusinessSections suggested={suggested} latest={latest} />
        ) : null}
      </main>

      <Footer showEnamad />
    </div>
  );
}
