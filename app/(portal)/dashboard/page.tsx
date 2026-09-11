import { PortalShell } from "@/components/shell/portal-shell";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardData } from "@/lib/data/dashboard";
import { applicationRoleSchema } from "@/lib/validation/applications";

type PageProps = { searchParams: Promise<{ role?: string }> };

/**
 * The signed-in home surface.
 *
 * A Server Component, so the guard, the query and the render all happen on the
 * server before any HTML is sent. There is no loading state and no client fetch:
 * the page either renders with data or redirects.
 *
 * The active role lives in the query string rather than in client state, which
 * is what makes the role tabs a shareable URL and keeps the back button working.
 * An unrecognised `?role=` falls back to hacker rather than 404ing — it is a
 * view preference, not a resource.
 *
 * `PortalShell` is a pure presentational component shared with the visual fixture
 * at `/design/hero`, which is how the design and the production page stay in step.
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const [data, query] = await Promise.all([getDashboardData(user.id), searchParams]);
  const activeRole = applicationRoleSchema.safeParse(query.role).data ?? "hacker";
  return <PortalShell {...data} activeRole={activeRole} />;
}
