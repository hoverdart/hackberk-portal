import type { ReactNode } from "react";

import { PortalFrame } from "@/components/shell/portal-frame";
import { requireUser } from "@/lib/auth/guards";

/** Organizer tools use the same account controls and return routes as the portal. */
export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  // The guard runs here so every route in the group is protected even if a
  // page forgets its own; the pages still guard individually.
  await requireUser();
  return <PortalFrame audience="organizer">{children}</PortalFrame>;
}
