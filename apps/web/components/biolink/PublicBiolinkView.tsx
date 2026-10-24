import Link from 'next/link';
import { ArrowRight, Briefcase, Crown, Home } from 'lucide-react';

import { CardFit } from '@/components/ui/CardFit';
import { LikeButton } from '@/components/ui/LikeButton';
import { OwnerEditButton } from '@/components/ui/OwnerEditButton';
import { PlanUpgradeNotice } from '@/components/ui/PlanUpgradeNotice';
import { SaveButton } from '@/components/ui/SaveButton';
import { ShareButton } from '@/components/ui/ShareButton';
import { BiolinkTemplateStage } from '@/components/biolink/BiolinkTemplateStage';
import {
  DEFAULT_DARK_TEMPLATE_KEY,
  DEFAULT_LIGHT_TEMPLATE_KEY,
} from '@/lib/biolink-templates';
import type { Biolink } from '@/lib/api';

interface Props {
  biolink: Biolink;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
  /** admin-enabled display templates (falls back to all when empty) */
  enabledTemplates?: string[];
  /** admin default template for light-mode pages */
  defaultTemplateLight?: string;
  /** admin default template for dark-mode pages */
  defaultTemplateDark?: string;
}

/**
 * Full public biolink page. The biolink body is rendered by
 * {@link BiolinkTemplateStage} in one of the ready-made «حالت نمایش» designs;
 * the visitor can switch between the templates the admin enabled, while the
 * surrounding chrome (header, share block) stays on-brand paper.
 */
export function PublicBiolinkView({
  biolink,
  qr,
  link,
  like,
  enabledTemplates,
  defaultTemplateLight,
  defaultTemplateDark,
}: Props) {
  const headline = biolink.jobTitle || biolink.company || biolink.fullName || 'بیولینک';

  return (
    <div className="card-public-page record-page">
      <div className="record-page-inner">
        <div className="card-public-inner w-full max-w-[520px]">
          <PlanUpgradeNotice
            ownerUserId={biolink.userId}
            hidesFields={biolink.planHidesFields}
          />

          {/* One aligned row: back link · plan badge · home link. */}
          <div className="card-public-top mb-3 flex shrink-0 items-center justify-between gap-2">
            <Link href="/biolinks" className="record-pill">
              <ArrowRight className="size-3.5" aria-hidden />
              بازگشت به دایرکتوری
            </Link>

            <div className="flex items-center gap-2">
              {biolink.planName ? (
                <span className="record-pill">
                  <Crown className="size-3.5" aria-hidden />
                  نوع اشتراک: {biolink.planName}
                </span>
              ) : null}
              <OwnerEditButton
                ownerUserId={biolink.userId}
                href={`/dashboard/biolinks/${biolink.id}/edit`}
                label="ویرایش این بیولینک"
              />
            </div>

            <Link href="/" className="record-pill">
              <Home className="size-3.5" aria-hidden />
              صفحه اصلی
            </Link>
          </div>

          {/* The chrome above and below stays put; this region shrinks the
              card to fit one screen (falling back to scrolling only when even
              the minimum scale cannot fit). */}
          <CardFit>
            <BiolinkTemplateStage
              biolink={biolink}
              enabledKeys={enabledTemplates ?? []}
              defaultLight={defaultTemplateLight ?? DEFAULT_LIGHT_TEMPLATE_KEY}
              defaultDark={defaultTemplateDark ?? DEFAULT_DARK_TEMPLATE_KEY}
            />
          </CardFit>

          <div className="card-public-share record-panel mt-4 flex shrink-0 items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR کد بیولینک"
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-lg bg-white p-1.5"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs font-bold text-ink">
                اسکن کنید یا لینک را به اشتراک بگذارید
              </p>
              <p dir="ltr" className="mt-1 break-all text-[11px] text-muted">
                {link}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/api/proxy/biolinks/public/${biolink.slug}/vcard`}
                  className="indeed-btn indeed-btn-primary flex-1 py-2 text-xs"
                >
                  ذخیره مخاطب
                </a>
                <LikeButton
                  kind="biolinks"
                  slug={biolink.slug}
                  initialCount={like?.likeCount ?? 0}
                  initialLiked={like?.liked ?? false}
                  size="md"
                />
                <ShareButton url={link} title={headline} size="md" iconOnly />
                <SaveButton
                  kind="biolinks"
                  slug={biolink.slug}
                  size="md"
                  iconOnly
                  reconcile
                />
              </div>
            </div>
          </div>

          {biolink.linkedBusinessCard ? (
            <Link
              href={`/business-cards/${biolink.linkedBusinessCard.slug}`}
              className="indeed-btn indeed-btn-secondary mt-3 w-full shrink-0"
            >
              <Briefcase className="size-4" aria-hidden />
              مشاهده کارت ویزیت این بیولینک
            </Link>
          ) : null}

          <p className="mt-3 shrink-0 text-center text-xs text-muted">
            ساخته‌شده با{' '}
            <Link href="/" className="font-bold underline">
              شمالی کارت
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
