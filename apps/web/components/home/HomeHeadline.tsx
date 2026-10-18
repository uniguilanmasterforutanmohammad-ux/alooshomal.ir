'use client';

import { useEffect, useState } from 'react';

/**
 * Animated home-page headline. Types the first phrase out, erases it, then
 * types the next one, looping forever — so the hero shows off both halves of
 * the product (digital business card + professional biolink) without a static
 * wall of text.
 *
 * The «با شمالی کارت» prefix stays fixed; only the phrase after it cycles. The
 * full sentence is also exposed on the wrapper's `aria-label` and the live text
 * is `aria-hidden`, so screen readers announce one stable sentence instead of a
 * letter-by-letter mutation. Visitors who ask for reduced motion get the first
 * phrase rendered statically.
 */
const PREFIX = 'با شمالی کارت';
const PHRASES = ['کارت ویزیت دیجیتال بساز', 'بیولینک حرفه‌ای بساز'];

/** Longest phrase; its (invisible) width is reserved so nothing ever shifts. */
const WIDEST = PHRASES.reduce((widest, phrase) =>
  phrase.length > widest.length ? phrase : widest,
);

const TYPE_MS = 90;
const ERASE_MS = 45;
const HOLD_MS = 1600;
const BETWEEN_MS = 350;

export function HomeHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [erasing, setErasing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(query.matches);
    const onChange = () => setReduceMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const phrase = PHRASES[phraseIndex];

    if (!erasing && length === phrase.length) {
      const timer = window.setTimeout(() => setErasing(true), HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    if (erasing && length === 0) {
      const timer = window.setTimeout(() => {
        setErasing(false);
        setPhraseIndex((current) => (current + 1) % PHRASES.length);
      }, BETWEEN_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => setLength((current) => current + (erasing ? -1 : 1)),
      erasing ? ERASE_MS : TYPE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [length, erasing, phraseIndex, reduceMotion]);

  const shown = reduceMotion
    ? PHRASES[0]
    : PHRASES[phraseIndex].slice(0, length);
  const caret = reduceMotion ? null : (
    <span className="typewriter-caret ms-1 inline-block h-[0.85em] w-[3px] translate-y-[0.08em] bg-white align-middle" />
  );

  return (
    // The animated phrase sits in an `inline-grid` cell that also holds the
    // widest phrase *plus the blinking caret* as an invisible spacer, so the
    // line's width — and therefore the fixed «با شمالی کارت» prefix — never
    // moves while typing/erasing. The visible text is `aria-hidden`; the stable
    // sentence lives in `aria-label` so screen readers never hear a
    // letter-by-letter mutation.
    <h1
      className="flex flex-wrap items-center justify-center gap-x-2 text-3xl font-extrabold leading-snug md:text-4xl"
      aria-label="با شمالی کارت کارت ویزیت دیجیتال یا بیولینک حرفه‌ای بساز"
    >
      <span aria-hidden>{PREFIX}</span>
      <span aria-hidden className="inline-grid text-start">
        {/* Invisible spacer: reserves the width of the longest phrase (+caret). */}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {WIDEST}
          {caret}
        </span>
        <span className="col-start-1 row-start-1 whitespace-nowrap">
          {shown}
          {caret}
        </span>
      </span>
    </h1>
  );
}
