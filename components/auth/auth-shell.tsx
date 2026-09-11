import type { ReactNode } from "react";

import { BrandRail } from "@/components/shell/brand-rail";

/** The frame around every signed-out page: the shared rail, then one paper sheet. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell desk">
      <BrandRail />
      <div className="auth-stage">{children}</div>
    </main>
  );
}
