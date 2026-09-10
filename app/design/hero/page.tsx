import { RunOfShow } from "@/components/shell/run-of-show";
import { applicationRoles } from "@/lib/domain/applications";

/**
 * Static, non-authenticated reproduction used only for visual regression checks.
 */
export default function HeroReproductionPage() {
  return (
    <RunOfShow preview profileName="Alex Chen" event={{ name: "AI Hackathon 2026", venue: "Berkeley, CA", startsAt: "2026-02-06T17:00:00-08:00", closesAt: "2026-01-23T23:59:00-08:00", synthetic: true }} applications={applicationRoles.map((role, index) => ({ id: index < 2 ? `preview-${role}` : null, role, status: index === 0 || index === 1 ? "draft" : "not_started", progress: index === 0 ? 72 : 0 }))} />
  );
}
