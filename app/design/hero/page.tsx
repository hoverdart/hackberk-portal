import { PortalShell } from "@/components/shell/portal-shell";
import { applicationRoles } from "@/lib/domain/applications";

/**
 * Static, non-authenticated reproduction used only for visual regression checks.
 */
/**
 * Visual fixture for the portal shell.
 *
 * Renders the production `PortalShell` with synthetic props and no database, so
 * the shell can be designed, screenshotted and regression-tested without an
 * account or a seeded event. It is intentionally not linked from anywhere public
 * — the landing page points at the real portal.
 */
export default function HeroReproductionPage() {
  return (
    <PortalShell preview profileName="Alex Chen" event={{ name: "AI Hackathon 2026", venue: "Herkeley, CA", startsAt: "2026-02-06T17:00:00-08:00", closesAt: "2026-01-23T23:59:00-08:00", synthetic: true }} applications={applicationRoles.map((role, index) => ({ id: index < 2 ? `preview-${role}` : null, role, status: index === 0 || index === 1 ? "draft" : "not_started", progress: index === 0 ? 72 : 0 }))} />
  );
}
