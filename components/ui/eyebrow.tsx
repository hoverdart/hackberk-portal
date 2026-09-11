import type { ReactNode } from "react";

/**
 * The small tracked label above a heading.
 *
 * Fifty-one of these were written by hand and styled by eighteen different
 * positional selectors — `.feature-mast > p`, `.action-feed header p`,
 * `.rubric-sheet > fieldset > p` — spanning `.45rem` to `.65rem` and `.08em` to
 * `.20em` of tracking for what is one idea. Worse, most fired *because the
 * element was the first `<p>` child*, so reordering two elements restyled the
 * page. `MessageSheet`'s own docstring already named that failure mode.
 *
 * Use it only when the label says something the heading does not. Most of the
 * old ones were decoration above a heading that already read clearly, and those
 * were deleted rather than converted.
 */
export function Eyebrow({ children, onNavy = false }: { children: ReactNode; onNavy?: boolean }) {
  return (
    <p className="eyebrow" data-on-navy={onNavy || undefined}>
      {children}
    </p>
  );
}
