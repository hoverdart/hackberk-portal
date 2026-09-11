import type { ReactNode } from "react";

/**
 * The stage for every signed-out form: one centred paper sheet.
 *
 * The rail that frames it belongs to `app/(site)/layout.tsx`, so it survives a
 * move between sign-in, sign-up and password reset instead of being rebuilt.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="auth-stage">{children}</div>;
}
