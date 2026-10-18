'use client';

import { useEffect, useState } from 'react';

/**
 * Animated home-page headline. Types the first phrase out, erases it, then
 * types the next one, looping forever — so the hero shows off both halves of
 * the product (digital business card + professional biolink) without a static
 * wall of text.
 *
 * The full phrases are also exposed on the wrapper's `aria-label` and the live
 * text is `aria-hidden`, so screen readers announce one stable sentence instead
 * of a letter-by-letter mutation. Visitors who ask for reduced motion get the
 * first phrase rendered statically.
 */
const PHRASES = ['کارت ویزیت دیجیتال بساز', 'بیولینک حرفه‌ای بساز'];

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

  return (
    // `min-h` keeps the hero from jumping while the phrase is typed/erased; the
    // visible text is `aria-hidden` and the stable sentence lives in
    // `aria-label`, so screen readers never hear a letter-by-letter mutation.
    <h1
      className="min-h-[2.6em] text-3xl font-extrabold leading-snug md:min-h-[1.4em] md:text-4xl"
      aria-label="کارت ویزیت دیجیتال و بیولینک حرفه‌ای بساز"
    >
      <span aria-hidden>
        {shown}
        {reduceMotion ? null : (
          <span className="typewriter-caret ms-1 inline-block h-[0.85em] w-[3px] translate-y-[0.08em] bg-white align-middle" />
        )}
      </span>
    </h1>
  );
}
