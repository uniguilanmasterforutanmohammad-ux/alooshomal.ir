'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Clock, Eye, IdCard, LifeBuoy } from 'lucide-react';

import { api, type Biolink, type BusinessCard, type Paged } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { useFeatures } from '@/lib/features';
import { useProfileStatus } from '@/lib/profile-status';
import { ManagementNudge } from '@/components/business/ManagementNudge';
import { Skeleton } from '@/components/ui/Skeleton';

interface TicketSummary {
  open: number;
  inProgress: number;
  closed: number;
  total: number;
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: typeof IdCard;
  label: string;
  value: number;
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
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light ${toneClass}`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-extrabold text-ink">
          {value.toLocaleString('fa-IR')}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const { workspace } = useBusinessWorkspace(hydrated && Boolean(token));
  const { status: profileStatus } = useProfileStatus(
    hydrated && Boolean(token),
  );
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [summary, setSummary] = useState<TicketSummary>({
    open: 0,
    inProgress: 0,
    closed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, cards, ticketSummary] = await Promise.all([
        // `workspace=all`: the dashboard summary counts the user's items across
        // every business, not only the workspace selected in the header.
        api.get<Paged<Biolink>>('/biolinks/mine?workspace=all'),
        api.get<Paged<BusinessCard>>('/business-cards/mine?workspace=all'),
        api.get<TicketSummary>('/tickets/mine/summary'),
      ]);
      setBiolinks(mine.items);
      setBusinessCards(cards.items);
      setSummary(ticketSummary);
    } catch {
      setBiolinks([]);
      setBusinessCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!token) {
      router.replace('/login');
      return;
    }
    void load();
  }, [hydrated, token, router, load]);

  const published = biolinks.filter((biolink) => biolink.isPublished).length;
  const pending = biolinks.filter((biolink) => biolink.status === 'PENDING').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">داشبورد کاربری</h2>
          <p className="text-sm text-muted">
            {user?.fullName ? `${user.fullName} عزیز، خوش آمدید` : 'خوش آمدید'}
          </p>
          {workspace ? (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2.5 py-1 text-[11px] font-bold text-ink">
              کسب‌وکار فعال:
              <span className="text-brand">{workspace.name}</span>
              <span className="text-muted">· {workspace.industry.label}</span>
            </p>
          ) : null}
        </div>
      </div>

      <ManagementNudge variant="banner" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[76px] w-full" />
          ))
        ) : (
          <>
            <StatTile icon={IdCard} label="بیولینک‌ها" value={biolinks.length} />
            <StatTile
              icon={IdCard}
              label="کارت‌های ویزیت"
              value={businessCards.length}
              tone="ok"
            />
            <StatTile
              icon={BadgeCheck}
              label="منتشرشده"
              value={published}
              tone="ok"
            />
            <StatTile
              icon={Clock}
              label="در انتظار تأیید"
              value={pending}
              tone="warn"
            />
          </>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
          <div className="indeed-panel p-5">
            <div className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-brand" aria-hidden />
              <h3 className="text-sm font-extrabold text-ink">وضعیت تیکت‌ها</h3>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-3 text-center">
              <li className="rounded-lg border border-[var(--vintage-border)] bg-white py-3">
                <p className="text-lg font-extrabold text-ink">{summary.open}</p>
                <p className="text-[11px] text-muted">باز</p>
              </li>
              <li className="rounded-lg border border-[var(--vintage-border)] bg-white py-3">
                <p className="text-lg font-extrabold text-ink">{summary.inProgress}</p>
                <p className="text-[11px] text-muted">در حال بررسی</p>
              </li>
              <li className="rounded-lg border border-[var(--vintage-border)] bg-white py-3">
                <p className="text-lg font-extrabold text-ink">{summary.closed}</p>
                <p className="text-[11px] text-muted">بسته</p>
              </li>
            </ul>
            <Link
              href="/dashboard/tickets"
              className="indeed-btn indeed-btn-secondary mt-3 w-full py-2 text-sm"
            >
              <LifeBuoy className="size-4" aria-hidden />
              مدیریت تیکت‌ها
            </Link>
          </div>

          <div className="indeed-panel p-5">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-brand" aria-hidden />
              <h3 className="text-sm font-extrabold text-ink">دسترسی سریع</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {profileStatus?.identity?.verified ? (
                <span className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-700">
                  <BadgeCheck className="size-4" aria-hidden />
                  تیک سفید فعال
                </span>
              ) : (
                <Link
                  href="/dashboard/inquiries?tick=white"
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  دریافت تیک سفید
                </Link>
              )}
              {profileStatus?.identity?.businessLicenseVerified ? (
                <span className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-xs font-bold text-sky-700">
                  <BadgeCheck className="size-4" aria-hidden />
                  تیک آبی فعال
                </span>
              ) : (
                <Link
                  href="/dashboard/inquiries?tick=blue"
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  دریافت تیک آبی
                </Link>
              )}
              {isFeatureVisible('featureOnboarding') &&
              profileStatus?.onboardingFinished !== true ? (
                <Link
                  href="/dashboard/onboarding"
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  شروع آسان
                </Link>
              ) : null}
              {isFeatureVisible('allowBiolinkCreation') ? (
                <Link
                  href="/dashboard/biolinks/new"
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  ساخت بیولینک
                </Link>
              ) : null}
              {isFeatureVisible('allowBusinessCardCreation') ? (
                <Link
                  href="/dashboard/business-cards/new"
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  ساخت کارت ویزیت
                </Link>
              ) : null}
              {isFeatureVisible('featureBoostRequests') ? (
                <Link
                  href="/dashboard/boost"
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  افزایش بازدید و تبلیغات
                </Link>
              ) : null}
              {isFeatureVisible('featureNews') ? (
                <Link
                  href="/dashboard/reporter"
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  شهروند خبرنگار
                </Link>
              ) : null}
              <Link
                href="/dashboard/subscriptions"
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                اشتراک من
              </Link>
            </div>
          </div>
      </div>

    </div>
  );
}
