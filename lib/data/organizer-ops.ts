import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Read model for the organizer's event-day and project-judging control sheet. */
export async function getOrganizerOperations(eventId: string) {
  const supabase = await createClient();
  // Judges are "accepted judge applications", not a separate roster — the
  // application record is the source of truth for who may judge.
  const [event, projects, judges, mentorRequests, shifts, audit] = await Promise.all([
    supabase
      .from("events")
      .select("id,name,venue,timezone,starts_at,ends_at,applications_close_at,is_synthetic")
      .eq("id", eventId)
      .single(),
    supabase
      .from("projects")
      .select("id,name,submitted_at,teams(name),project_review_assignments(id,judge_id)")
      .eq("event_id", eventId)
      .order("submitted_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("applications")
      .select("applicant_id,profiles(full_name,preferred_name)")
      .eq("event_id", eventId)
      .eq("role", "judge")
      .eq("status", "accepted"),
    supabase
      .from("mentor_requests")
      .select("id,title,status,expertise_tags,created_at,claimed_by")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    supabase
      .from("volunteer_shifts")
      .select(
        "id,title,location,starts_at,ends_at,capacity,volunteer_shift_assignments(volunteer_id,checked_in_at,checked_out_at)",
      )
      .eq("event_id", eventId)
      .order("starts_at"),
    // Recent audit entries only. This is an at-a-glance control sheet, not the
    // full history; the cap keeps the page bounded as an event runs long.
    supabase
      .from("audit_log")
      .select("id,action,entity_type,entity_id,before_state,after_state,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  // `audit_log.entity_id` is deliberately polymorphic, so resolve only the
  // application rows named by this bounded audit page. Fetching the whole event
  // roster here would turn a 50-row activity feed into an unbounded read.
  const auditedApplicationIds = [
    ...new Set(
      (audit.data ?? []).filter((entry) => entry.entity_type === "application").map((entry) => entry.entity_id),
    ),
  ];
  const { data: auditedApplications } = auditedApplicationIds.length
    ? await supabase
        .from("applications")
        .select("id,role,profiles(full_name,preferred_name)")
        .in("id", auditedApplicationIds)
    : { data: [] };
  const applicationsById = new Map(
    (auditedApplications ?? []).map((application) => {
      const profile = application.profiles as unknown as { full_name: string; preferred_name: string | null } | null;
      return [
        application.id,
        {
          id: application.id,
          role: application.role,
          applicantName: profile?.preferred_name || profile?.full_name || "Applicant",
        },
      ];
    }),
  );

  return {
    event: event.data,
    projects: projects.data ?? [],
    judges: judges.data ?? [],
    mentorRequests: mentorRequests.data ?? [],
    shifts: shifts.data ?? [],
    audit: (audit.data ?? []).map((entry) => ({
      ...entry,
      application: applicationsById.get(entry.entity_id) ?? null,
    })),
  };
}
