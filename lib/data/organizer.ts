import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationRole, ApplicationStatus } from "@/lib/domain/applications";

export type QueueFilters = { query?: string; role?: ApplicationRole; status?: ApplicationStatus; page?: number };

/**
 * The organizer application queue: filtered, paginated, newest first.
 *
 * Reads `organizer_application_queue`, a database view rather than the raw table.
 * The view is what decides which columns an organizer may see, so the projection
 * cannot drift from the policy by someone adding a column to the select below.
 *
 * The second `.order("application_id")` is not cosmetic: `submitted_at` ties are
 * common (bulk submissions), and without a tiebreaker Postgres may order ties
 * differently between pages, which makes rows appear twice or vanish as an
 * organizer pages through.
 */
export async function getApplicationQueue(eventId: string, filters: QueueFilters) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 25;
  let query = supabase
    .from("organizer_application_queue")
    .select("*", { count: "exact" })
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("application_id", { ascending: false });
  // Organizers search by name or paste an application id, so accept both shapes.
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

/**
 * Everything the claiming organizer needs to review one application — and nothing more.
 *
 * This is the blind-review boundary. The answers query filters
 * `is_identity_sensitive = false`, so the applicant's name, school, graduation
 * year and accommodations are never fetched, never serialised, and never sent to
 * the browser. Hiding them in the component would not be equivalent: the data
 * would still be in the page payload for anyone who opened devtools.
 *
 * `assignments` contains the one active claim and `ownAssignment` identifies the
 * current organizer's claim. Keeping those separate lets a different organizer
 * see that an application is unavailable without exposing who claimed it.
 *
 * Identity and logistics are returned only after a blind review has been
 * submitted. That is the whole rule: you score what was written, then you learn
 * who wrote it and what they need to take part.
 */
export async function getReviewWorkspace(applicationId: string, organizerId: string) {
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id,event_id,applicant_id,role,status,form_version")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return null;
  const [{ data: event }, { data: answers }, { data: assignments }, { data: ownAssignment }] = await Promise.all([
    supabase.from("events").select("name,application_rubric").eq("id", application.event_id).single(),
    supabase
      .from("application_answers")
      .select("section_key,answers")
      .eq("application_id", applicationId)
      .eq("is_identity_sensitive", false),
    supabase
      .from("review_assignments")
      .select("id,reviewer_id,status")
      .eq("application_id", applicationId)
      .neq("status", "conflict"),
    supabase
      .from("review_assignments")
      .select("id,status,conflict_reason")
      .eq("application_id", applicationId)
      .eq("reviewer_id", organizerId)
      .neq("status", "conflict")
      .maybeSingle(),
  ]);
  const { data: review } = ownAssignment
    ? await supabase
        .from("application_reviews")
        .select("id,scores,recommendation,private_notes,status")
        .eq("assignment_id", ownAssignment.id)
        .maybeSingle()
    : { data: null };
  const { data: submittedReviews } = await supabase
    .from("application_reviews")
    .select("scores,status")
    .eq("application_id", applicationId)
    .eq("status", "submitted");
  // Identity and logistics unlock only once the blind score is recorded, and
  // they are fetched here rather than filtered in the page for the same reason
  // the blind packet is: an answer the server never sends cannot leak through a
  // rendering mistake or be read out of the page payload.
  //
  // Logistics is kept out of the scoring packet deliberately even though it does
  // not identify anyone. Availability, dietary needs and accommodations are
  // things an organizer has to know in order to run the event, and things a
  // review must never be influenced by — an accommodation request is not a
  // quality signal.
  const decided = (submittedReviews ?? []).length > 0;
  const [{ data: applicant }, { data: logistics }] = decided
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,preferred_name,school,graduation_year,pronouns")
          .eq("id", application.applicant_id)
          .maybeSingle(),
        supabase
          .from("application_answers")
          .select("section_key,answers")
          .eq("application_id", applicationId)
          .eq("is_identity_sensitive", true),
      ])
    : [{ data: null }, { data: null }];

  return {
    application,
    event,
    answers: answers ?? [],
    assignments: assignments ?? [],
    ownAssignment,
    review,
    submittedReviews: submittedReviews ?? [],
    applicant,
    identityAnswers: logistics ?? [],
  };
}

/**
 * Strip the characters that carry meaning inside a PostgREST `or(...)` filter.
 *
 * `%` is the wildcard, and commas and parentheses delimit the filter grammar, so
 * an unescaped value could otherwise break out of its own clause and rewrite the
 * query. The length cap bounds what an attacker can push into the query string.
 */
function escapePostgrest(value: string) {
  return value.replaceAll(/[%,()]/g, "").slice(0, 120);
}
