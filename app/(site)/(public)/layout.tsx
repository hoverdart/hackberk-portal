import type { ReactNode } from "react";

import { AuthShell } from "@/components/auth/auth-shell";

/**
 * Layout for the unauthenticated routes: sign-in, sign-up, password reset, and
 * the legal pages.
 *
 * They all share `AuthShell` — the navy rail plus one centred paper sheet.
 * `/about` deliberately sits outside this group because its 520px sheet is the
 * wrong frame for a page meant to be read at length.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
