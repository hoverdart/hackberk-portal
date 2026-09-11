import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * The heading of a panel: an optional label, an optional icon, a title.
 *
 * There were three mutually inconsistent ways to put an icon next to a heading.
 * One was correct (`.match-list > h2`: flex, centred, sized). One stacked the
 * icon above the title at 42px. The third — used four times on the organizer
 * operations page — wrote `<h2><GitFork /> Submitted projects</h2>` with no
 * sizing and no alignment at all, so a 24px SVG sat as an inline replaced
 * element on the text baseline of a 29px display heading. Its bottom edge lined
 * up with the bottom of the letters while the cap-height sat well above, which
 * is why those icons looked dropped and detached from their headings.
 *
 * This is the correct treatment, and now the only one.
 */
export function SheetHeader({
  eyebrow,
  icon: Icon,
  title,
  children,
}: {
  eyebrow?: string;
  icon?: LucideIcon;
  title: ReactNode;
  /** Actions aligned to the end of the header row. */
  children?: ReactNode;
}) {
  return (
    <header className="sheet-header">
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="sheet-header__title">
          {Icon ? <Icon aria-hidden /> : null}
          {title}
        </h2>
      </div>
      {children}
    </header>
  );
}
