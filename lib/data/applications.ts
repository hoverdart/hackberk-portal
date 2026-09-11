import "server-only";

import { completionForAnswers } from "@/lib/applications/definitions";
import type { ApplicationRole, ApplicationStatus } from "@/lib/domain/applications";
import { createClient } from "@/lib/supabase/server";

/**
 * Read model for one role's application, used by the multi-step wizard.
 *
 * `lockVersion` guards the application row and `answerVersions` guard each
 * section independently. Two levels because the wizard saves one section at a
 * time: a section save only needs to prove that *that* section has not moved,
 * while submitting the whole application needs the row itself to be unchanged.
 */
export type ApplicationRecord = {
  id: string;
  eventId: string;
  role: ApplicationRole;
  status: ApplicationStatus;
  lockVersion: number;
  answers: Record<string, Record<string, unknown>>;
  answerVersions: Record<string, number>;
  progress: number;
};

/**
 * The one event currently accepting applications.
 *
 * The schema supports many events, but the portal surfaces a single active one
 * at a time. `is_active` is the switch; `maybeSingle` returns null rather than
 * throwing when no event is live.
 */
export async function getActiveEvent() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,name,applications_close_at,is_synthetic")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name, closesAt: data.applications_close_at, synthetic: data.is_synthetic };
}

/** Owner-scoped repository query; RLS repeats the ownership check in Postgres. */
export async function getApplication(
  userId: string,
  eventId: string,
  role: ApplicationRole,
): Promise<ApplicationRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id,event_id,role,status,lock_version")
    .eq("applicant_id", userId)
    .eq("event_id", eventId)
    .eq("role", role)
    .maybeSingle();
  if (!data) return null;
  // Answers live in their own table, one row per wizard section, so a save
  // touches only the section being edited and sections can version separately.
  const { data: answerRows } = await supabase
    .from("application_answers")
    .select("section_key,answers,answer_version")
    .eq("application_id", data.id);
  const answers = Object.fromEntries(
    (answerRows ?? []).map((row) => [row.section_key, row.answers as Record<string, unknown>]),
  );
  const answerVersions = Object.fromEntries((answerRows ?? []).map((row) => [row.section_key, row.answer_version]));
  // Progress is derived from the answers on every read rather than stored. A
  // stored percentage would drift the moment the question set changed.
  return {
    id: data.id,
    eventId: data.event_id,
    role: data.role,
    status: data.status,
    lockVersion: data.lock_version,
    answers,
    answerVersions,
    progress: completionForAnswers(role, answers),
  };
}
