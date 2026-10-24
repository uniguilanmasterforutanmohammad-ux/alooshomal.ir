'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, Crown, Home } from 'lucide-react';

import { CardFit } from '@/components/ui/CardFit';
import { LikeButton } from '@/components/ui/LikeButton';
import { OwnerEditButton } from '@/components/ui/OwnerEditButton';
import { PlanUpgradeNotice } from '@/components/ui/PlanUpgradeNotice';
import { SaveButton } from '@/components/ui/SaveButton';
import { ShareButton } from '@/components/ui/ShareButton';
import {
  BiolinkTemplateStage,
  biolinkModesFor,
  initialModeFor,
} from '@/components/biolink/BiolinkTemplateStage';
import { biolinkTemplate } from '@/lib/biolink-templates';
import type { Biolink } from '@/lib/api';

interface Props {
  biolink: Biolink;
  qr: string;
  link: string;
  like?: { liked: boolean; likeCount: number };
}

/**
 * Full public biolink page. A published biolink has up to two view modes: the
 * classic «رکورد» look and the ready-made design its owner chose. The visitor
 * can flip between them here (remembered per biolink).
 *
 * In the classic mode the page keeps its full chrome (back link, share block,
 * QR, …). In a ready-made design mode the page deliberately shows **only** the
 * design box, floated on a background tinted from the design's palette.
 */
export function PublicBiolinkView({ biolink, qr, link, like }: Props) {
  const headline = biolink.jobTitle || biolink.company || biolink.fullName || 'بیولینک';

  const modes = useMemo(() => biolinkModesFor(biolink), [biolink]);
  const storageKey = `biolink-view:${biolink.slug}`;
  const [mode, setMode] = useState<string>(() => initialModeFor(biolink));

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && modes.some((m) => m.key === stored)) setMode(stored);
    } catch {
      /* storage may be blocked; ignore */
    }
  }, [storageKey, modes]);

  function choose(key: string) {
    setMode(key);
    try {
      localStorage.setItem(storageKey, key);
    } catch {
      /* ignore */
    }
  }

  const design = biolinkTemplate(mode);
  const switcher =
    modes.length > 1 ? (
      <div className="blt-switch" role="group" aria-label="انتخاب حالت نمایش">
        <span className="blt-switch-label">حالت نمایش:</span>
        {modes.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => choose(entry.key)}
            aria-pressed={mode === entry.key}
            className={mode === entry.key ? 'blt-switch-chip is-active' : 'blt-switch-chip'}
            title={entry.name}
          >
            <span
              className="blt-switch-dot"
              style={{
                background: `linear-gradient(135deg, ${entry.swatch[0]} 0 34%, ${entry.swatch[1]} 34% 67%, ${entry.swatch[2]} 67% 100%)`,
              }}
            />
            {entry.name}
          </button>
        ))}
      </div>
    ) : null;

  // ---- ready-made design mode: only the box, on a themed background ----
  // On phones/tablets the box fills the whole screen (see `.blt-page` in
  // `globals.css`); on desktop it stays centred at a comfortable width.
  if (design) {
    return (
      <div
        className="blt-page"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, ${design.swatch[1]}66 0%, ${design.swatch[0]}33 45%, #0b0b12 100%)`,
        }}
      >
        <div className="blt-page-inner">
          <div className="blt-page-switch">{switcher}</div>
          {/* No fit-to-one-screen here: the design box fills the screen on
              phones/tablets and scrolls if it is taller than the viewport. */}
          <div className="blt-page-scroll">
            <BiolinkTemplateStage biolink={biolink} mode={mode} />
          </div>
        </div>
      </div>
    );
  }

  // ---- classic «رکورد» mode: full page chrome ----
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

          {switcher ? <div className="mb-3 shrink-0">{switcher}</div> : null}

          {/* The chrome above and below stays put; this region shrinks the
              record to fit one screen (falling back to scrolling only when even
              the minimum scale cannot fit). */}
          <CardFit>
            <BiolinkTemplateStage biolink={biolink} mode={mode} />
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
