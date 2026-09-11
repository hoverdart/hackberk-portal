import "server-only";

import { cache } from "react";

import { getApplicationDefinition, schemaForSection } from "@/lib/applications/definitions";
import {
  applicationRoles,
  type ApplicationRole,
  type ApplicationSummary,
  type SectionProgress,
} from "@/lib/domain/applications";
import { createClient } from "@/lib/supabase/server";

/**
 * Read model for the portal shell (the signed-in landing surface).
 *
 * The shape below is deliberately narrow. The shell shows which roles you hold
 * and how far along each is; it never loads the answers themselves. Section
 * completion is evaluated here, on the server, and only the resulting booleans
 * cross to the browser — so a shell render cannot ship identity-sensitive
 * answers even though it now knows which sections are finished.
 */
export type DashboardData = {
  event: { id: string; name: string; venue: string; startsAt: string; closesAt: string; synthetic: boolean };
  profileName: string;
  applications: ApplicationSummary[];
  databaseAvailable: boolean;
};

/**
 * The signed-in user's display name.
 *
 * `cache` for the same reason `requireUser` uses it: the portal frame renders on
 * every route and the dashboard wants the same name, so without this one page
 * render would issue two identical queries for one string.
 */
export const getProfileName = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("preferred_name,full_name").eq("id", userId).maybeSingle();
  return (data?.preferred_name || data?.full_name || "Applicant") as string;
});

/**
 * Shown when the database is unreachable.
 *
 * The portal degrades to a read-only shell rather than an error page, so a
 * visitor can still see what the product is. `databaseAvailable: false` travels
 * with it so the UI can say drafts cannot be saved right now instead of
 * pretending everything is fine.
 */
const fallback = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Herkeley Build 2027",
  venue: "Herkeley · Pauley Ballroom",
  startsAt: "2027-03-07T01:00:00.000Z",
  closesAt: "2027-01-20T07:59:00.000Z",
  synthetic: true,
};

/** An untouched role: every section outstanding, nothing started. */
function emptySummary(role: ApplicationRole): ApplicationSummary {
  return { id: null, role, status: "not_started", progress: 0, sections: sectionsFor(role, {}) };
}

/**
 * Evaluate each section of a role against the answers stored for it.
 *
 * This reuses the same `schemaForSection` the wizard validates with and the
 * submit action re-checks against, so "complete" means exactly one thing across
 * the whole product rather than three subtly different things.
 */
function sectionsFor(role: ApplicationRole, answers: Record<string, Record<string, unknown>>): SectionProgress[] {
  return getApplicationDefinition(role).map((section) => ({
    key: section.key,
    title: section.title,
    complete: schemaForSection(section).safeParse(answers[section.key] ?? {}).success,
  }));
}

/** Returns a deliberately small DTO; identity-sensitive answers never enter the shell. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  // The event and the profile are independent reads, so issue them together
  // rather than paying two sequential round trips.
  const [eventResult, profileName] = await Promise.all([
    supabase
      .from("events")
      .select("id,name,venue,starts_at,applications_close_at,is_synthetic")
      .eq("is_active", true)
      .maybeSingle(),
    getProfileName(userId),
  ]);
  // No active event (or no database) means there is nothing to apply to; fall
  // back rather than throwing, so the shell still renders.
  if (eventResult.error || !eventResult.data) {
    return { event: fallback, profileName, applications: applicationRoles.map(emptySummary), databaseAvailable: false };
  }
  const event = eventResult.data;
  const appResult = await supabase
    .from("applications")
    .select("id,role,status")
    .eq("event_id", event.id)
    .eq("applicant_id", userId);
  const rows = appResult.data ?? [];

  // One query for every section of every role the user has started, rather than
  // one per application. The answers are read here and discarded below; only the
  // per-section booleans survive into the DTO.
  const answersByApplication = new Map<string, Record<string, Record<string, unknown>>>();
  if (rows.length > 0) {
    const { data: answerRows } = await supabase
      .from("application_answers")
      .select("application_id,section_key,answers")
      .in(
        "application_id",
        rows.map((row) => row.id as string),
      );
    for (const row of answerRows ?? []) {
      const bucket = answersByApplication.get(row.application_id as string) ?? {};
      bucket[row.section_key as string] = row.answers as Record<string, unknown>;
      answersByApplication.set(row.application_id as string, bucket);
    }
  }

  return {
    event: {
      id: event.id as string,
      name: event.name as string,
      venue: event.venue as string,
      startsAt: event.starts_at as string,
      closesAt: event.applications_close_at as string,
      synthetic: Boolean(event.is_synthetic),
    },
    profileName,
    // Map over the canonical role list rather than over the returned rows, so a
    // role the user has never opened still gets a "not started" card. The shell
    // must always show all four.
    applications: applicationRoles.map((role) => {
      const row = rows.find((candidate) => candidate.role === role);
      if (!row) return emptySummary(role);
      const sections = sectionsFor(role, answersByApplication.get(row.id as string) ?? {});
      // Derived, never stored: a stored percentage would drift the moment the
      // question set changed. Same rule as `getApplication`.
      const complete = sections.filter((section) => section.complete).length;
      return {
        id: row.id as string,
        role,
        status: row.status as ApplicationSummary["status"],
        progress: Math.round((complete / sections.length) * 100),
        sections,
      };
    }),
    databaseAvailable: !appResult.error,
  };
}
