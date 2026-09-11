import type { ReactNode } from "react";

import { PortalFrame } from "@/components/shell/portal-frame";
import { getAcceptedRoles, getOrganizerMembership, requireUser } from "@/lib/auth/guards";

/**
 * The one layout every signed-in route renders inside — applicant and organizer
 * alike.
 *
 * Applicant and organizer routes used to live in two sibling route groups, each
 * with its own layout rendering its own `PortalFrame`. Crossing between them
 * unmounted the whole rail and mounted a new one, so moving from the queue to
 * the event page tore down the navigation and rebuilt it. Nesting both groups
 * under this single layout is what makes the rail persist: Next caches a layout
 * on the client and does not re-render it during navigation, so there is now
 * exactly one frame instance for the life of the page.
 *
 * The route groups below it are kept for readability only — `(portal)` and
 * `(organizer)` are both stripped from the URL, so every path is unchanged.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // The guard runs here so every route in the group is protected even if a
  // page forgets its own; the pages still guard individually.
  await requireUser();
  const organizer = await getOrganizerMembership();
  // An organizer holds no application roles, so skip the query entirely.
  const roles = organizer ? [] : [...(await getAcceptedRoles())];
  return (
    <PortalFrame audience={organizer ? "organizer" : "applicant"} roles={roles}>
      {children}
    </PortalFrame>
  );
}
