import { NextRequest, NextResponse } from "next/server";

import { requireOrganizer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * CSV export of the organizer application queue.
 *
 * A route handler rather than a Server Action because the browser needs a file
 * download. Two things are load-bearing:
 *
 *  - it reads the same `organizer_application_queue` view the on-screen queue
 *    does, so the export cannot expose a column the interface withholds;
 *  - `requireOrganizer()` runs before anything else, and the query is pinned to
 *    that organizer's own event.
 *
 * `no-store` keeps applicant data out of shared caches and browser history.
 */
export async function GET(request: NextRequest) {
  const organizer = await requireOrganizer();
  const params = request.nextUrl.searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("organizer_application_queue")
    .select(
      "application_id,applicant_name,role,status,submitted_at,assigned_reviewers,submitted_reviews,aggregate_score",
    )
    .eq("event_id", organizer.eventId)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(10_000);
  if (params.get("role")) query = query.eq("role", params.get("role") as "hacker" | "judge" | "mentor" | "volunteer");
  if (params.get("status")) query = query.eq("status", params.get("status") as "draft");
  if (params.get("query"))
    query = query.ilike(
      "applicant_name",
      `%${params
        .get("query")!
        .replaceAll(/[%,()]/g, "")
        .slice(0, 120)}%`,
    );
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Export could not be generated." }, { status: 500 });
  // Keep the exported terminology aligned with the single-organizer workflow
  // while retaining the stable view column name behind the API.
  const columns = [
    { source: "application_id", header: "application_id" },
    { source: "applicant_name", header: "applicant_name" },
    { source: "role", header: "role" },
    { source: "status", header: "status" },
    { source: "submitted_at", header: "submitted_at" },
    { source: "assigned_reviewers", header: "assigned_organizer_reviews" },
    { source: "submitted_reviews", header: "submitted_organizer_reviews" },
    { source: "aggregate_score", header: "aggregate_score" },
  ] as const;
  const csv = [
    columns.map(({ header }) => header).join(","),
    ...(data ?? []).map((row) => columns.map(({ source }) => csvCell(row[source])).join(",")),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="applications.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * Quote a CSV cell.
 *
 * Wrapping every value in quotes and doubling any internal quote keeps commas,
 * quotes and newlines inside a field from breaking the row structure.
 */
function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
