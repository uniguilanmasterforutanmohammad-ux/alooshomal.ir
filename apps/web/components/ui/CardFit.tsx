'use client';

import { FitContent } from './FitContent';

interface Props {
  children: React.ReactNode;
  /** lowest allowed shrink factor applied after the compact layout kicks in */
  minScale?: number;
  /**
   * stretch a short card to fill the whole screen height (the biolink page
   * distributes the slack across its link rows).
   */
  fill?: boolean;
}

/**
 * The single scrollable region of a public card page (`/biolinks/<slug>`,
 * `/business-cards/<slug>`). It uses the shared {@link FitContent} measurement
 * engine (see that file for the details) and only adds the card-page class
 * names / attribute hooks the `globals.css` dense layout targets.
 */
export function CardFit({ children, minScale = 0.75, fill }: Props) {
  return (
    <FitContent
      className="card-public-scroll"
      minScale={minScale}
      fill={fill}
      mirrorCompactToParent
    >
      {children}
    </FitContent>
  );
}
