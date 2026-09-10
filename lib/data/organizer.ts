import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationRole, ApplicationStatus } from "@/lib/domain/applications";

export type QueueFilters = { query?: string; role?: ApplicationRole; status?: ApplicationStatus; page?: number };

export async function getApplicationQueue(eventId: string, filters: QueueFilters) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 25;
  let query = supabase.from("organizer_application_queue").select("*", { count: "exact" }).eq("event_id", eventId).order("submitted_at", { ascending: false, nullsFirst: false }).order("application_id", { ascending: false });
  if (filters.query) {
    const safeQuery = escapePostgrest(filters.query);
    query = /^[0-9a-f-]{36}$/i.test(safeQuery)
      ? query.or(`applicant_name.ilike.%${safeQuery}%,application_id.eq.${safeQuery}`)
      : query.ilike("applicant_name", `%${safeQuery}%`);
  }
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("status", filters.status);
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  return { rows: data ?? [], count: count ?? 0, page, pageSize, error: error?.message };
}

export async function getReviewWorkspace(applicationId: string, reviewerId: string) {
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("id,event_id,role,status,form_version").eq("id", applicationId).maybeSingle();
  if (!application) return null;
  const [{ data: event }, { data: answers }, { data: assignments }, { data: ownAssignment }] = await Promise.all([
    supabase.from("events").select("name,application_rubric").eq("id", application.event_id).single(),
    supabase.from("application_answers").select("section_key,answers").eq("application_id", applicationId).eq("is_identity_sensitive", false),
    supabase.from("review_assignments").select("id,reviewer_id,status").eq("application_id", applicationId),
    supabase.from("review_assignments").select("id,status,conflict_reason").eq("application_id", applicationId).eq("reviewer_id", reviewerId).maybeSingle(),
  ]);
  const { data: review } = ownAssignment ? await supabase.from("application_reviews").select("id,scores,recommendation,private_notes,status").eq("assignment_id", ownAssignment.id).maybeSingle() : { data: null };
  const { data: submittedReviews } = await supabase.from("application_reviews").select("scores,status").eq("application_id", applicationId).eq("status", "submitted");
  return { application, event, answers: answers ?? [], assignments: assignments ?? [], ownAssignment, review, submittedReviews: submittedReviews ?? [] };
}

function escapePostgrest(value: string) {
  return value.replaceAll(/[%,()]/g, "").slice(0, 120);
}
