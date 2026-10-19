'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** lowest allowed shrink factor applied after the compact layout kicks in */
  minScale?: number;
}

/**
 * The single scrollable region of a public card page (`/biolinks/<slug>`,
 * `/business-cards/<slug>`).
 *
 * A record with *every* field filled can be taller than the room left under the
 * pinned chrome (top row + QR/share block). Instead of making the visitor
 * scroll, this wrapper measures the natural content height against the space
 * available in its parent and, when the two overflow, switches the card into a
 * denser layout (`data-compact`) and — as a final touch — proportionally shrinks
 * it with a CSS transform so the whole thing fits one screen. Short cards are
 * left completely untouched (no compact class, scale 1).
 *
 * The available height is measured from the *parent* (only the preceding /
 * following sibling chrome), never from this element, so resizing the card can
 * never feed back into the measurement and oscillate. The compact class is
 * latched so re-measuring the now-shorter card cannot turn it back off and
 * flicker.
 */
export function CardFit({ children, minScale = 0.75 }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [fit, setFit] = useState<{
    scale: number;
    height: number | null;
    fits: boolean;
  }>({ scale: 1, height: null, fits: true });
  const widthRef = useRef(0);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const parent = outer?.parentElement;
    if (!outer || !inner || !parent) return;

    // Natural (untransformed) height of the card content.
    const natural = inner.scrollHeight;

    // Space left for the card = parent height minus the sibling chrome.
    let used = 0;
    for (const el of Array.from(parent.children) as HTMLElement[]) {
      if (el === outer) continue;
      const cs = getComputedStyle(el);
      used +=
        el.offsetHeight +
        parseFloat(cs.marginTop || '0') +
        parseFloat(cs.marginBottom || '0');
    }
    const available = parent.clientHeight - used;
    if (available <= 0) return;

    // First overflow turns on the dense layout (latched until a width change).
    if (!compact && natural > available + 1) {
      setCompact(true);
      return;
    }

    if (natural > available + 1) {
      const scale = Math.max(minScale, available / natural);
      const fits = natural * scale <= available + 1;
      // Only reserve a fixed height when the card truly fits at that scale;
      // otherwise keep it scrollable (height null -> content-driven).
      const next = { scale, height: fits ? natural * scale : null, fits };
      setFit((prev) =>
        prev.scale === next.scale && prev.height === next.height && prev.fits === next.fits
          ? prev
          : next,
      );
    } else {
      setFit((prev) =>
        prev.scale === 1 && prev.height === null && prev.fits ? prev : { scale: 1, height: null, fits: true },
      );
    }
  }, [compact, minScale]);

  useEffect(() => {
    measure();
    const outer = outerRef.current;
    const inner = innerRef.current;
    const parent = outer?.parentElement ?? null;
    const ro = new ResizeObserver(() => measure());
    if (outer) ro.observe(outer);
    if (inner) ro.observe(inner);
    if (parent) ro.observe(parent);
    // A width change can drop the compact layout again (e.g. rotating to
    // landscape / a wider window), so re-evaluate from scratch on resize.
    const onResize = () => {
      const w = outer?.clientWidth ?? 0;
      if (Math.abs(w - widthRef.current) > 1) {
        widthRef.current = w;
        setCompact(false);
        setFit({ scale: 1, height: null, fits: true });
        window.requestAnimationFrame(() => measure());
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    // Webfonts / images can settle a tick later and change the height.
    const timer = window.setTimeout(measure, 350);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
  }, [measure]);

  // Mirror the compact flag onto the card container so the share block (a
  // sibling of this region, not a child) can also tighten itself.
  useEffect(() => {
    const parent = outerRef.current?.parentElement;
    if (!parent) return;
    if (compact) parent.setAttribute('data-compact', '');
    else parent.removeAttribute('data-compact');
  }, [compact]);

  const scaled = fit.scale < 1;

  return (
    <div
      ref={outerRef}
      className="card-public-scroll"
      data-compact={compact ? '' : undefined}
      data-fits={fit.fits ? '' : undefined}
      style={fit.height != null ? { height: fit.height } : undefined}
    >
      <div
        ref={innerRef}
        style={
          scaled
            ? { transform: `scale(${fit.scale})`, transformOrigin: 'top center' }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
