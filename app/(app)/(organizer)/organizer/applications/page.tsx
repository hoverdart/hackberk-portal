import { ButtonLink } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
import Link from "next/link";

import { QueueFilters } from "@/components/organizer/queue-filters";
import { formatEventDate } from "@/lib/formatters/event-time";
import { StatusStamp } from "@/components/ui/status-stamp";
import { requireOrganizer } from "@/lib/auth/guards";
import { getApplicationQueue } from "@/lib/data/organizer";
import { applicationRoleSchema } from "@/lib/validation/applications";
import { applicationStatuses, capitalize, type ApplicationStatus } from "@/lib/domain/applications";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The organizer application queue.
 *
 * Filters live in the query string, so a filtered view is a shareable URL and the
 * back button works. Reads the `organizer_application_queue` view, which is what
 * decides the visible columns.
 */
export default async function OrganizerApplicationsPage({ searchParams }: PageProps) {
  const organizer = await requireOrganizer();
  const params = await searchParams;
  const role = applicationRoleSchema.safeParse(params.role).data;
  const statusValue =
    typeof params.status === "string" && applicationStatuses.includes(params.status as ApplicationStatus)
      ? (params.status as ApplicationStatus)
      : undefined;
  const query = typeof params.query === "string" ? params.query : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const queue = await getApplicationQueue(organizer.eventId, { query, role, status: statusValue, page });
  const totalPages = Math.max(1, Math.ceil(queue.count / queue.pageSize));
  const exportQuery = new URLSearchParams({
    ...(query ? { query } : {}),
    ...(role ? { role } : {}),
    ...(statusValue ? { status: statusValue } : {}),
  });

  return (
    <main className="organizer-page">
      <header className="organizer-mast">
        <div>
          <h1>Applications</h1>
          <span>
            {queue.count.toLocaleString()} {queue.count === 1 ? "application" : "applications"} · names are hidden while
            you score
          </span>
        </div>
        <ButtonLink variant="secondary" size="sm" href={`/organizer/applications/export?${exportQuery}`}>
          <Download aria-hidden />
          Export CSV
        </ButtonLink>
      </header>
      <QueueFilters values={{ query, role, status: statusValue }} />
      {queue.error ? (
        <p className="queue-error" role="alert">
          The queue could not load: {queue.error}
        </p>
      ) : null}
      <div className="queue-table-wrap">
        <table className="queue-table">
          <caption className="sr-only">Applications and review status</caption>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Role</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Review progress</th>
              <th>Aggregate</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {queue.rows.map((row) => (
              <tr key={row.application_id}>
                {/* Blind until scored. The review screen promises the
                    applicant's identity is hidden while you score, and that
                    promise was worth nothing while the list you clicked through
                    to get there printed their name. */}
                <td>
                  <strong>
                    {row.submitted_reviews > 0 ? row.applicant_name : `${capitalize(row.role)} applicant`}
                  </strong>
                  <small>{row.application_id.slice(0, 8)}</small>
                </td>
                <td>{row.role}</td>
                <td>
                  <StatusStamp status={row.status} />
                </td>
                <td>{row.submitted_at ? formatEventDate(row.submitted_at, queue.timeZone) : "Draft"}</td>
                <td>
                  <span className="review-meter">
                    <i style={{ width: `${Math.min(row.submitted_reviews, 1) * 100}%` }} />
                  </span>
                  <small>
                    {row.submitted_reviews > 0 ? "Scored" : row.assigned_reviewers > 0 ? "Claimed" : "Unclaimed"}
                  </small>
                </td>
                <td>{row.aggregate_score ? `${row.aggregate_score} / 5` : "—"}</td>
                <td>
                  <Link href={`/organizer/applications/${row.application_id}/review`}>
                    <Eye aria-hidden />
                    Review
                    <span className="sr-only">
                      {" "}
                      {row.submitted_reviews > 0
                        ? row.applicant_name
                        : `${row.role} application ${row.application_id.slice(0, 8)}`}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue.rows.length === 0 ? (
          <div className="empty-state">
            <strong>No applications match this queue.</strong>
            <span>Clear a filter or search a different applicant.</span>
          </div>
        ) : null}
      </div>
      <nav className="queue-pagination" aria-label="Application pages">
        <Link aria-disabled={page <= 1} href={pageHref(params, page - 1)}>
          <ChevronLeft aria-hidden />
          Previous
        </Link>
        <span>
          Page {page} of {totalPages}
        </span>
        <Link aria-disabled={page >= totalPages} href={pageHref(params, page + 1)}>
          Next
          <ChevronRight aria-hidden />
        </Link>
      </nav>
    </main>
  );
}

function pageHref(params: Record<string, string | string[] | undefined>, page: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (typeof value === "string" && key !== "page") next.set(key, value);
  next.set("page", String(Math.max(1, page)));
  return `/organizer/applications?${next}`;
}
