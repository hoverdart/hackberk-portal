import type { ReactNode } from "react";

import { BrandRail } from "@/components/shell/brand-rail";

/**
 * The one layout every signed-out route renders inside.
 *
 * The rail lives here rather than in each page for the same reason it lives in
 * one layout on the signed-in side: Next caches a layout on the client and does
 * not re-render it during navigation, so there is exactly one rail instance for
 * the life of the visit. Rendering it per page meant moving between the landing
 * page, sign-in and /about tore the navigation down and built it again each
 * time — which is visible, and which the rail is the last element on screen that
 * should ever do.
 *
 * Each child supplies its own stage as the second grid column, because a
 * centred credential sheet, a full-bleed hero and a long read want different
 * frames.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <BrandRail />
      {children}
    </div>
  );
}
