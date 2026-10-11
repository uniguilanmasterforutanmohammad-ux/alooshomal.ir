'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Clock,
  Eye,
  IdCard,
  LifeBuoy,
  Plus,
  XCircle,
} from 'lucide-react';

import { BiolinkStatusBadge } from '@/components/biolink/BiolinkStatusBadge';
import { BusinessCardStatusBadge } from '@/components/businesscard/BusinessCardStatusBadge';
import { api, type Biolink, type BusinessCard } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
    try {
      const [mine, cards, ticketSummary] = await Promise.all([
        api.get<Biolink[]>('/biolinks/mine'),
        api.get<BusinessCard[]>('/business-cards/mine'),
        api.get<TicketSummary>('/tickets/mine/summary'),
      ]);
      setBiolinks(mine);
      setBusinessCards(cards);
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
  const rejected = biolinks.filter((biolink) => biolink.status === 'REJECTED').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">داشبورد کاربری</h2>
          <p className="text-sm text-muted">
            {user?.fullName ? `${user.fullName} عزیز، خوش آمدید` : 'خوش آمدید'}
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={IdCard} label="بیولینک‌ها" value={biolinks.length} />
        <StatTile
          icon={IdCard}
          label="کارت‌های ویزیت"
          value={businessCards.length}
          tone="ok"
        />
        <StatTile icon={BadgeCheck} label="منتشرشده" value={published} tone="ok" />
        <StatTile icon={Clock} label="در انتظار تأیید" value={pending} tone="warn" />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
      <div className="indeed-panel overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
          <h3 className="text-sm font-extrabold text-ink">آخرین کارت‌های ویزیت من</h3>
          <Link
            href="/dashboard/business-cards"
            className="text-xs font-bold text-brand"
          >
            مشاهده همه
          </Link>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : businessCards.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted">هنوز کارت ویزیتی نساخته‌اید.</p>
            <Link
              href="/dashboard/business-cards/new"
              className="indeed-btn indeed-btn-primary mt-4"
            >
              <Plus className="size-4" aria-hidden />
              ساخت اولین کارت ویزیت
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--vintage-border)]">
            {businessCards.slice(0, 4).map((card) => (
              <li
                key={card.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {card.fullName}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {card.jobTitle ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BusinessCardStatusBadge status={card.status} />
                  <Link
                    href={`/dashboard/business-cards/${card.id}/edit`}
                    className="text-xs font-bold text-brand"
                  >
                    ویرایش
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

        <div className="indeed-panel overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
            <h3 className="text-sm font-extrabold text-ink">آخرین بیولینک‌های من</h3>
            <Link href="/dashboard/biolinks" className="text-xs font-bold text-brand">
              مشاهده همه
            </Link>
          </div>
          {loading ? (
            <p className="p-6 text-center text-sm text-muted">در حال بارگذاری...</p>
          ) : biolinks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted">هنوز بیولینکی نساخته‌اید.</p>
              <Link href="/dashboard/biolinks/new" className="indeed-btn indeed-btn-primary mt-4">
                <Plus className="size-4" aria-hidden />
                ساخت اولین بیولینک
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--vintage-border)]">
              {biolinks.slice(0, 4).map((biolink) => (
                <li key={biolink.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{biolink.fullName}</p>
                    <p className="truncate text-xs text-muted">
                      {biolink.jobTitle ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BiolinkStatusBadge status={biolink.status} />
                    <Link
                      href={`/dashboard/biolinks/${biolink.id}/edit`}
                      className="text-xs font-bold text-brand"
                    >
                      ویرایش
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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
              <Link
                href="/biolinks"
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                دایرکتوری بیولینک‌ها
              </Link>
              <Link
                href="/dashboard/biolinks/new"
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                ساخت بیولینک
              </Link>
              <Link
                href="/business-cards"
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                دایرکتوری کارت ویزیت
              </Link>
              <Link
                href="/dashboard/business-cards/new"
                className="indeed-btn indeed-btn-secondary py-2 text-sm"
              >
                ساخت کارت ویزیت
              </Link>
            </div>
          </div>
      </div>

    </div>
  );
}
