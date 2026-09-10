import Image from "next/image";
import type { ReactNode } from "react";

import tower from "@/assets/plates/tower-illustration.png";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * The frame around every unauthenticated page: a navy rail on the left, the
 * form sheet on the right.
 *
 * The motto is live DOM text, and the Campanile is a transparent line-art plate.
 * Both matter: the plate as originally generated had the same words baked into
 * the raster, so the page rendered them twice, and its baked navy did not match
 * the rail. Keeping words as words also keeps them selectable, translatable, and
 * legible to a screen reader. See `assets/plates/tower-illustration.png.json`.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <aside className="auth-rail">
        <Wordmark href="/" />
        <div className="auth-rail-copy"><span>BUILD</span><span>PEOPLE</span><span>IDEAS</span><span>A BRIGHTER TOMORROW</span></div>
        {/* Decorative but not meaningless, so it keeps a short alt rather than "". */}
        <Image src={tower} alt="Campanile line illustration" priority className="auth-tower" />
      </aside>
      <div className="auth-stage">{children}</div>
    </main>
  );
}
