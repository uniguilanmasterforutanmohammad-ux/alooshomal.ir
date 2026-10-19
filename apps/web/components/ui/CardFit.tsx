'use client';

import { FitContent } from './FitContent';

interface Props {
  children: React.ReactNode;
  /** lowest allowed shrink factor applied after the compact layout kicks in */
  minScale?: number;
}

/**
 * The single scrollable region of a public card page (`/biolinks/<slug>`,
 * `/business-cards/<slug>`). It uses the shared {@link FitContent} measurement
 * engine (see that file for the details) and only adds the card-page class
 * names / attribute hooks the `globals.css` dense layout targets.
 */
export function CardFit({ children, minScale = 0.75 }: Props) {
  return (
    <FitContent
      className="card-public-scroll"
      minScale={minScale}
      mirrorCompactToParent
    >
      {children}
    </FitContent>
  );
}
