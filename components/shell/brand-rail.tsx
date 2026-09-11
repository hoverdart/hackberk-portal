import Image from "next/image";
import type { ReactNode } from "react";

import tower from "@/assets/plates/tower-illustration.png";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * The navy rail down the left of every page.
 *
 * There used to be three of these and they agreed on almost nothing. The portal
 * had a 210px column with the Campanile and the motto beside it. The auth pages
 * had a `minmax(230px, 30vw)` column with a differently-sized Campanile and the
 * motto stacked above it. The landing page had no rail component at all — just
 * `.landing::before`, a bare gradient pseudo-element at 28% of the viewport
 * (over 500px on a wide screen) holding nothing, with the hero shoved aside by a
 * matching `margin-left: 28%`.
 *
 * One component, one width, one treatment: the portal's, because it was the one
 * that worked. The motto sits beside the Campanile rather than above or below
 * it, which is the composition the drawing was made for.
 *
 * The plate is transparent line art and the motto is live DOM text. Both matter:
 * the plate as generated had the same words baked into the raster in a navy that
 * did not match the rail, so the page rendered them twice. Keeping words as
 * words also keeps them selectable, translatable and legible to a screen reader.
 * See `assets/plates/tower-illustration.png.json`.
 */
export function BrandRail({ homeHref = "/", children }: { homeHref?: string | null; children?: ReactNode }) {
  return (
    <aside className="app-rail">
      <Wordmark href={homeHref} />
      {children}
      <div className="app-rail-foot">
        {/* Decorative but not meaningless, so it keeps a short alt rather than "". */}
        <Image src={tower} alt="Campanile line illustration" priority className="app-tower" />
        <p className="app-motto">
          BUILD
          <br />
          PEOPLE
          <br />
          IDEAS
          <br />A BRIGHTER
          <br />
          TOMORROW
        </p>
      </div>
    </aside>
  );
}
