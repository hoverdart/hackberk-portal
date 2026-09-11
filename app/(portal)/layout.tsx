import type { ReactNode } from "react";

import { PortalFrame } from "@/components/shell/portal-frame";
import { getOrganizerMembership, requireUser } from "@/lib/auth/guards";

/** Keeps every applicant-facing route inside the same navigable application frame. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  // The guard runs here so every route in the group is protected even if a
  // page forgets its own; the pages still guard individually.
  await requireUser();
  const organizer = await getOrganizerMembership();
  return <PortalFrame audience={organizer ? "organizer" : "applicant"}>{children}</PortalFrame>;
}
