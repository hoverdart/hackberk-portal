import { NextRequest, NextResponse } from "next/server";

import { requireOrganizer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const organizer = await requireOrganizer();
  const params = request.nextUrl.searchParams;
  const supabase = await createClient();
  let query = supabase.from("organizer_application_queue").select("application_id,applicant_name,role,status,submitted_at,assigned_reviewers,submitted_reviews,aggregate_score").eq("event_id", organizer.eventId).order("submitted_at", { ascending: false, nullsFirst: false }).limit(10_000);
  if (params.get("role")) query = query.eq("role", params.get("role") as "hacker" | "judge" | "mentor" | "volunteer");
  if (params.get("status")) query = query.eq("status", params.get("status") as "draft");
  if (params.get("query")) query = query.ilike("applicant_name", `%${params.get("query")!.replaceAll(/[%,()]/g, "").slice(0, 120)}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Export could not be generated." }, { status: 500 });
  const headers = ["application_id", "applicant_name", "role", "status", "submitted_at", "assigned_reviewers", "submitted_reviews", "aggregate_score"];
  const csv = [headers.join(","), ...(data ?? []).map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="applications.csv"', "Cache-Control": "private, no-store" } });
}

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
