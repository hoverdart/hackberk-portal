import { PortalFrame } from "@/components/shell/portal-frame";
import { PortalShell } from "@/components/shell/portal-shell";
import { getApplicationDefinition } from "@/lib/applications/definitions";
import { applicationRoles, type ApplicationRole } from "@/lib/domain/applications";
import { applicationRoleSchema } from "@/lib/validation/applications";

/**
 * The visual fixture for the signed-in shell.
 *
 * A public route with no session, rendering the same `PortalFrame` and
 * `PortalShell` the dashboard does. That is the point: the design can be
 * reviewed, and the browser tests can assert against it, without seeding a user
 * — and because it is the production component rather than a copy, the fixture
 * cannot drift away from what applicants actually see.
 *
 * The data below is fixture data, shaped exactly like the real DTO. The role
 * tabs switch on this route's own URL, so the deck's re-ordering animation can
 * be exercised and reviewed without a session.
 */
export default async function HeroReproductionPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const activeRole = applicationRoleSchema.safeParse((await searchParams).role).data ?? "hacker";
  return (
    <PortalFrame preview>
      <PortalShell
        preview
        profileName="Alex Chen"
        activeRole={activeRole}
        basePath="/design/hero"
        event={{
          name: "Herkeley Build 2027",
          venue: "Herkeley · Pauley Ballroom",
          startsAt: "2027-03-06T17:00:00-08:00",
          closesAt: "2027-01-19T23:59:00-08:00",
          synthetic: true,
        }}
        applications={applicationRoles.map((role, index) => ({
          id: index < 2 ? `preview-${role}` : null,
          role,
          status: index < 2 ? ("draft" as const) : ("not_started" as const),
          progress: index === 0 ? 33 : 0,
          // Mirror the real derivation: the hacker role has its opening section
          // finished, everything else is outstanding.
          sections: previewSections(role, index === 0 ? 1 : 0),
        }))}
      />
    </PortalFrame>
  );
}

/** The role's real section list, with the first `completed` of them ticked. */
function previewSections(role: ApplicationRole, completed: number) {
  return getApplicationDefinition(role).map((section, index) => ({
    key: section.key,
    title: section.title,
    complete: index < completed,
  }));
}
