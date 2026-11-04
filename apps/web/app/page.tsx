import Link from 'next/link';
import './hero-brick.css';
import './site-bg-pattern.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ReporterCtaButton } from '@/components/news/ReporterCtaButton';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import { HomeSearchBox } from '@/components/home/HomeSearchBox';
import { HomeHeadline } from '@/components/home/HomeHeadline';
import { BadgeCheck, Smartphone } from 'lucide-react';

/**
 * Public home page. It is deliberately minimal: the hero (headline, city line,
 * search box and the two directory buttons) plus the «شهروند خبرنگار شوید»
 * invitation. The ads box, the latest business-cards/biolinks sliders, the city
 * news table, the blog picks and the «چطور کار می‌کند؟» / feature guide cards
 * were removed on request.
 */
export default async function HomePage() {
  // The admin can stop any public section; the hero buttons then drop out too
  // and the site-wide notice bar explains why.
  const stopped = await getStoppedSections();
  const showCards = !isRouteStopped(stopped, '/business-cards');
  const showBiolinks = !isRouteStopped(stopped, '/biolinks');

  return (
    /* The home page is a one-screen column: the shell reserves the height left
       by the chrome (66px sticky header on desktop, 56px fixed bottom nav on
       phones/tablets — the latter already padded by `body`), and the hero takes
       whatever is left after the invitation box and the footer, so the page
       never scrolls. */
    <div className="home-shell flex min-h-[calc(100dvh-56px)] flex-col lg:min-h-[calc(100dvh-66px)]">
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
            </div>
          </div>
        </section>

        <section className="container-page mt-4 sm:mt-16">
          {/* Stacked on phones (the buttons row needs the full width) and a
              single spread row from `sm` up. */}
          <div className="indeed-panel flex flex-col gap-3 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-ink">شهروند خبرنگار شوید</h2>
              <p className="mt-1 text-sm text-muted">
                خبرهای شهر خود را ثبت کنید تا پس از تأیید مدیر منتشر شود.
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
      </main>

      <Footer />
    </div>
  );
}
