import { PortalShell } from "@/components/shell/portal-shell";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardData } from "@/lib/data/dashboard";

/**
 * The signed-in home surface.
 *
 * A Server Component, so the guard, the query and the render all happen on the
 * server before any HTML is sent. There is no loading state and no client fetch:
 * the page either renders with data or redirects.
 *
 * `PortalShell` is a pure presentational component shared with the visual fixture
 * at `/design/hero`, which is how the design and the production page stay in step.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  return <PortalShell {...data} />;
}
