import "server-only";

import { completionForAnswers } from "@/lib/applications/definitions";
import type { ApplicationRole, ApplicationStatus } from "@/lib/domain/applications";
import { createClient } from "@/lib/supabase/server";

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

export async function getActiveEvent() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("id,name,applications_close_at,is_synthetic").eq("is_active", true).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name, closesAt: data.applications_close_at, synthetic: data.is_synthetic };
}

/** Owner-scoped repository query; RLS repeats the ownership check in Postgres. */
export async function getApplication(userId: string, eventId: string, role: ApplicationRole): Promise<ApplicationRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("id,event_id,role,status,lock_version").eq("applicant_id", userId).eq("event_id", eventId).eq("role", role).maybeSingle();
  if (!data) return null;
  const { data: answerRows } = await supabase.from("application_answers").select("section_key,answers,answer_version").eq("application_id", data.id);
  const answers = Object.fromEntries((answerRows ?? []).map((row) => [row.section_key, row.answers as Record<string, unknown>]));
  const answerVersions = Object.fromEntries((answerRows ?? []).map((row) => [row.section_key, row.answer_version]));
  return { id: data.id, eventId: data.event_id, role: data.role, status: data.status, lockVersion: data.lock_version, answers, answerVersions, progress: completionForAnswers(role, answers) };
}
