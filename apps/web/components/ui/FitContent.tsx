'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** class applied to the measuring/scrolling region */
  className?: string;
  /**
   * lowest allowed shrink factor applied after the compact layout kicks in;
   * guards legibility when even the dense layout cannot fit.
   */
  minScale?: number;
  /** mirror the compact flag onto the parent (so sibling chrome can tighten) */
  mirrorCompactToParent?: boolean;
}

/**
 * Shared "fit in one screen" wrapper used by the public card pages and the
 * directory detail panels.
 *
 * It measures the natural (untransformed) height of its content against the
 * room left in its parent — parent height minus any sibling chrome — and, when
 * the two overflow, switches the content into a denser layout (`data-compact`,
 * latched) and, as a final step, proportionally shrinks it with a CSS transform
 * (`data-fits`). When the content already fits, nothing changes (scale 1, no
 * attributes), so short content is never touched.
 *
 * Measuring from the *parent* (never from this element) keeps resizing the card
 * from feeding back into the measurement and oscillating. The compact flag is
 * re-evaluated from scratch whenever the width changes.
 */
export function FitContent({
  children,
  className,
  minScale = 0.75,
  mirrorCompactToParent,
}: Props) {
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

    // Natural (untransformed) height of the content.
    const natural = inner.scrollHeight;

    // Space left = parent height minus the sibling chrome.
    let used = 0;
    for (const el of Array.from(parent.children) as HTMLElement[]) {
      if (el === outer) continue;
      const cs = getComputedStyle(el);
      used +=
        el.offsetHeight +
        parseFloat(cs.marginTop || '0') +
        parseFloat(cs.marginBottom || '0');
    }
    // This element's own vertical padding/border also eats into the viewport
    // (it is a scroll region that pads its content, e.g. the detail panel), so
    // subtract it from the available room as well.
    const outerCs = getComputedStyle(outer);
    const outerBox =
      parseFloat(outerCs.paddingTop || '0') +
      parseFloat(outerCs.paddingBottom || '0') +
      parseFloat(outerCs.borderTopWidth || '0') +
      parseFloat(outerCs.borderBottomWidth || '0');
    const available = parent.clientHeight - used - outerBox;
    if (available <= 0) return;

    // First overflow turns on the dense layout (latched until a width change).
    if (!compact && natural > available + 1) {
      setCompact(true);
      return;
    }

    if (natural > available + 1) {
      const scale = Math.max(minScale, available / natural);
      const fits = natural * scale <= available + 1;
      // Reserve a fixed height only when the content truly fits at that scale;
      // otherwise keep it scrollable (height null -> content-driven). The fixed
      // height is on the *border box*, so add back this element's own padding +
      // border (which the inner content does not occupy).
      const next = {
        scale,
        height: fits ? natural * scale + outerBox : null,
        fits,
      };
      setFit((prev) =>
        prev.scale === next.scale && prev.height === next.height && prev.fits === next.fits
          ? prev
          : next,
      );
    } else {
      setFit((prev) =>
        prev.scale === 1 && prev.height === null && prev.fits
          ? prev
          : { scale: 1, height: null, fits: true },
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

  useEffect(() => {
    if (!mirrorCompactToParent) return;
    const parent = outerRef.current?.parentElement;
    if (!parent) return;
    if (compact) parent.setAttribute('data-compact', '');
    else parent.removeAttribute('data-compact');
  }, [compact, mirrorCompactToParent]);

  const scaled = fit.scale < 1;

  return (
    <div
      ref={outerRef}
      className={className}
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
