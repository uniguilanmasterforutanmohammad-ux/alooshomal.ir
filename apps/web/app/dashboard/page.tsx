'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Building2,
  Coins,
  CreditCard,
  Crown,
  Headset,
  ImagePlus,
  LifeBuoy,
  Newspaper,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';

import {
  api,
  type FeedMineOverview,
  type MySubscriptions,
  type MyWallet,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { useFeatures } from '@/lib/features';
import { useProfileStatus } from '@/lib/profile-status';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface TicketSummary {
  open: number;
  inProgress: number;
  closed: number;
  total: number;
}

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: typeof Bookmark;
  feature?: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: '/dashboard/saved',
    label: 'ذخیره‌شده‌های من',
    description: 'بیولینک‌ها، کارت‌ها و پست‌های ذخیره‌شده',
    icon: Bookmark,
  },
  {
    href: '/dashboard/feeds',
    label: 'پست‌های من',
    description: 'انتشار پست و مدیریت محتوا',
    icon: ImagePlus,
    feature: 'featureFeedPosts',
  },
  {
    href: '/dashboard/wallet',
    label: 'کیف پول',
    description: 'موجودی، بدهی و تسویه‌حساب',
    icon: Wallet,
    feature: 'featureWallet',
  },
  {
    href: '/dashboard/payments',
    label: 'پرداخت‌های من',
    description: 'فاکتورها و سابقه‌ی تراکنش‌ها',
    icon: CreditCard,
    feature: 'featureMyPayments',
  },
  {
    href: '/dashboard/subscriptions',
    label: 'اشتراک من',
    description: 'وضعیت اشتراک، تمدید و ارتقا',
    icon: Crown,
  },
  {
    href: '/dashboard/inquiries',
    label: 'استعلام و خدمات',
    description: 'تیک سفید، تیک آبی و خدمات',
    icon: ShieldCheck,
    feature: 'featureZohalInquiries',
  },
  {
    href: '/dashboard/tickets',
    label: 'تیکت‌های پشتیبانی',
    description: 'پیگیری درخواست‌های پشتیبانی',
    icon: LifeBuoy,
  },
  {
    href: '/dashboard/support',
    label: 'پشتیبانی آنلاین',
    description: 'گفت‌وگو با تیم پشتیبانی',
    icon: Headset,
  },
  {
    href: '/dashboard/profile',
    label: 'پروفایل کاربری',
    description: 'اطلاعات حساب و امنیت',
    icon: UserRound,
  },
  {
    href: '/dashboard/boost',
    label: 'افزایش بازدید و تبلیغات',
    description: 'پله، تبلیغ و دیده‌شدن بیشتر',
    icon: TrendingUp,
    feature: 'featureBoostRequests',
  },
  {
    href: '/dashboard/reporter',
    label: 'شهروند خبرنگار',
    description: 'ارسال خبر و گزارش محلی',
    icon: Newspaper,
    feature: 'featureNews',
  },
  {
    href: '/dashboard/points',
    label: 'امتیاز من',
    description: 'امتیازها و جوایز فعالیت',
    icon: Coins,
    feature: 'featureNews',
  },
];

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof Bookmark;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warn' | 'ok';
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-amber-600'
      : tone === 'ok'
        ? 'text-emerald-600'
        : 'text-brand';
  return (
    <div className="indeed-panel flex items-center gap-3.5 p-4">
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light',
          toneClass,
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-lg font-extrabold text-ink">{value}</p>
        {hint ? <p className="text-[10px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const { isFeatureVisible } = useFeatures();
  // `isFeatureVisible` is a fresh closure on every render; keep it in a ref so
  // `load` stays stable and the effect doesn't refetch in an endless loop.
  const isFeatureVisibleRef = useRef(isFeatureVisible);
  isFeatureVisibleRef.current = isFeatureVisible;
  const { status: profileStatus } = useProfileStatus(
    hydrated && Boolean(token),
  );
  const { workspace } = useBusinessWorkspace(hydrated && Boolean(token));
  const [wallet, setWallet] = useState<MyWallet | null>(null);
  const [subscriptions, setSubscriptions] = useState<MySubscriptions | null>(
    null,
  );
  const [tickets, setTickets] = useState<TicketSummary>({
    open: 0,
    inProgress: 0,
    closed: 0,
    total: 0,
  });
  const [feeds, setFeeds] = useState<FeedMineOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const isVisible = isFeatureVisibleRef.current;
    const walletEnabled = isVisible('featureWallet');
    const feedsEnabled = isVisible('featureFeedPosts');
    const [walletResult, subscriptionResult, ticketResult, feedResult] =
      await Promise.allSettled([
        walletEnabled ? api.get<MyWallet>('/wallet/me') : Promise.resolve(null),
        api.get<MySubscriptions>('/subscriptions/me'),
        api.get<TicketSummary>('/tickets/mine/summary'),
        feedsEnabled
          ? api.get<FeedMineOverview>('/feeds/mine')
          : Promise.resolve(null),
      ]);
    setWallet(
      walletResult.status === 'fulfilled' ? walletResult.value : null,
    );
    setSubscriptions(
      subscriptionResult.status === 'fulfilled'
        ? subscriptionResult.value
        : null,
    );
    setTickets(
      ticketResult.status === 'fulfilled'
        ? ticketResult.value
        : { open: 0, inProgress: 0, closed: 0, total: 0 },
    );
    setFeeds(feedResult.status === 'fulfilled' ? feedResult.value : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  const identity = profileStatus?.identity ?? null;
  const profileCompleted = profileStatus?.profileCompleted === true;
  const onboardingFinished = profileStatus?.onboardingFinished === true;
  const businessVisible = isFeatureVisible('featureBusinessWorkspace');
  const onboardingVisible = isFeatureVisible('featureOnboarding');
  const hasBusiness = Boolean(workspace && !workspace.isPlaceholder);
  const quickLinks = QUICK_LINKS.filter(
    (item) => !item.feature || isFeatureVisible(item.feature),
  );
  const walletBalance = wallet?.balance ?? 0;
  const walletLabel =
    walletBalance < 0
      ? `${Math.abs(walletBalance).toLocaleString('fa-IR')} تومان بدهی`
      : `${walletBalance.toLocaleString('fa-IR')} تومان`;
  const planLabel = subscriptions?.plan?.name ?? 'بدون اشتراک';

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">پنل من</h1>
          <p className="mt-1 text-sm text-muted">
            {user?.fullName ? `${user.fullName} عزیز، خوش آمدید` : 'خوش آمدید'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {identity?.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
              <BadgeCheck className="size-3.5" aria-hidden />
              هویت تأیید شده
            </span>
          ) : (
            <Link
              href="/dashboard/onboarding"
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800"
            >
              <ShieldCheck className="size-3.5" aria-hidden />
              تکمیل احراز هویت
            </Link>
          )}
          {subscriptions?.plan ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2.5 py-1 text-ink">
              <Crown className="size-3.5" aria-hidden />
              {subscriptions.plan.name}
            </span>
          ) : null}
        </div>
      </header>

      {!profileCompleted ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 leading-6">
            پروفایل شما کامل نیست؛ برای استفاده از خدمات و خرید، ابتدا استعلام
            هویت را در «شروع آسان» تکمیل کنید.
          </span>
          <Link
            href="/dashboard/onboarding"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            تکمیل پروفایل
          </Link>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[76px] w-full" />
          ))
        ) : (
          <>
            <StatTile
              icon={Wallet}
              label="کیف پول"
              value={wallet ? walletLabel : '—'}
              hint={wallet?.overdue ? 'تسویه‌حساب سررسید شده است' : undefined}
              tone={wallet?.overdue ? 'warn' : 'default'}
            />
            <StatTile icon={Crown} label="اشتراک فعلی" value={planLabel} />
            <StatTile
              icon={LifeBuoy}
              label="تیکت‌های باز"
              value={tickets.open.toLocaleString('fa-IR')}
              hint={`${tickets.inProgress.toLocaleString('fa-IR')} در حال بررسی`}
              tone={tickets.open > 0 ? 'warn' : 'ok'}
            />
            <StatTile
              icon={ImagePlus}
              label="پست‌های من"
              value={
                feeds ? feeds.posts.length.toLocaleString('fa-IR') : '—'
              }
              hint={feeds?.active ? 'اشتراک پست فعال' : undefined}
              tone="ok"
            />
          </>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="indeed-panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-ink">دسترسی سریع</h2>
            <span className="text-[11px] text-muted">
              سرویس‌های حساب شما
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="group flex items-start gap-3 rounded-xl border border-[var(--vintage-border)] p-3 transition hover:border-brand hover:bg-brand-light/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <item.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-ink">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-5 text-muted">
                    {item.description}
                  </span>
                </span>
                <ArrowLeft
                  className="mt-1 size-3.5 shrink-0 text-muted transition group-hover:text-brand"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          {businessVisible ? (
            <section className="indeed-panel flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-brand" aria-hidden />
                <h2 className="text-sm font-extrabold text-ink">کسب‌وکار</h2>
              </div>
              {hasBusiness && workspace ? (
                <>
                  <p className="text-xs leading-6 text-muted">
                    کسب‌وکار فعال شما:
                  </p>
                  <div className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] p-3">
                    <p className="text-sm font-extrabold text-ink">
                      {workspace.name}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {workspace.industry.label} ·{' '}
                      {workspace.modules.filter((module) => module.enabled).length}{' '}
                      ماژول فعال
                    </p>
                  </div>
                  <Link
                    href="/dashboard/business"
                    prefetch={false}
                    className="indeed-btn indeed-btn-primary py-2 text-sm"
                  >
                    ورود به پنل کسب‌وکار
                    <ArrowLeft className="size-4" aria-hidden />
                  </Link>
                  <Link
                    href="/dashboard/business/overview"
                    prefetch={false}
                    className="text-center text-[11px] font-bold text-brand underline underline-offset-4"
                  >
                    مدیریت کسب‌وکار و ماژول‌ها
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs leading-6 text-muted">
                    هنوز کسب‌وکاری نساخته‌اید. با «شروع آسان» می‌توانید
                    کسب‌وکار خود را ثبت کنید و از پنل مدیریت کسب‌وکار استفاده
                    کنید.
                  </p>
                  <Link
                    href={
                      onboardingVisible
                        ? '/dashboard/onboarding'
                        : '/dashboard/business/overview'
                    }
                    prefetch={false}
                    className="indeed-btn indeed-btn-primary py-2 text-sm"
                  >
                    <Sparkles className="size-4" aria-hidden />
                    {onboardingVisible
                      ? 'شروع کسب‌وکار'
                      : 'ورود به پنل کسب‌وکار'}
                  </Link>
                </>
              )}
            </section>
          ) : null}

          <section className="indeed-panel p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-ink">
                وضعیت تیکت‌ها
              </h2>
              <Link
                href="/dashboard/tickets"
                prefetch={false}
                className="text-[11px] font-bold text-brand"
              >
                همه
              </Link>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
              <li className="rounded-lg border border-[var(--vintage-border)] bg-white py-2.5">
                <p className="text-base font-extrabold text-ink">
                  {tickets.open.toLocaleString('fa-IR')}
                </p>
                <p className="text-[10px] text-muted">باز</p>
              </li>
              <li className="rounded-lg border border-[var(--vintage-border)] bg-white py-2.5">
                <p className="text-base font-extrabold text-ink">
                  {tickets.inProgress.toLocaleString('fa-IR')}
                </p>
                <p className="text-[10px] text-muted">در حال بررسی</p>
              </li>
              <li className="rounded-lg border border-[var(--vintage-border)] bg-white py-2.5">
                <p className="text-base font-extrabold text-ink">
                  {tickets.closed.toLocaleString('fa-IR')}
                </p>
                <p className="text-[10px] text-muted">بسته</p>
              </li>
            </ul>
          </section>

          {!onboardingFinished && onboardingVisible ? (
            <section className="indeed-panel border-brand/40 p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" aria-hidden />
                <h2 className="text-sm font-extrabold text-ink">شروع آسان</h2>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted">
                احراز هویت، ثبت کسب‌وکار و انتخاب اشتراک را مرحله‌به‌مرحله
                کامل کنید.
              </p>
              <Link
                href="/dashboard/onboarding"
                prefetch={false}
                className="indeed-btn indeed-btn-secondary mt-3 w-full py-2 text-sm"
              >
                ادامه‌ی شروع آسان
                <ArrowLeft className="size-4" aria-hidden />
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
