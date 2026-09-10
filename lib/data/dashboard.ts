import "server-only";

import { applicationRoles, type ApplicationSummary } from "@/lib/domain/applications";
import { createClient } from "@/lib/supabase/server";

export type DashboardData = {
  event: { id: string; name: string; venue: string; startsAt: string; closesAt: string; synthetic: boolean };
  profileName: string;
  applications: ApplicationSummary[];
  databaseAvailable: boolean;
};

const fallback = { id: "00000000-0000-4000-8000-000000000001", name: "Berkeley Build 2027 — Synthetic Demo", venue: "UC Berkeley · Pauley Ballroom", startsAt: "2027-03-07T01:00:00.000Z", closesAt: "2027-01-20T07:59:00.000Z", synthetic: true };

/** Returns a deliberately small DTO; identity-sensitive answers never enter the shell. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const [eventResult, profileResult] = await Promise.all([
    supabase.from("events").select("id,name,venue,starts_at,applications_close_at,is_synthetic").eq("is_active", true).maybeSingle(),
    supabase.from("profiles").select("preferred_name,full_name").eq("id", userId).maybeSingle(),
  ]);
  if (eventResult.error || !eventResult.data) {
    return { event: fallback, profileName: "Applicant", applications: applicationRoles.map((role) => ({ id: null, role, status: "not_started", progress: 0 })), databaseAvailable: false };
  }
  const event = eventResult.data;
  const appResult = await supabase.from("applications").select("id,role,status").eq("event_id", event.id).eq("applicant_id", userId);
  const rows = appResult.data ?? [];
  return {
    event: { id: event.id as string, name: event.name as string, venue: event.venue as string, startsAt: event.starts_at as string, closesAt: event.applications_close_at as string, synthetic: Boolean(event.is_synthetic) },
    profileName: (profileResult.data?.preferred_name || profileResult.data?.full_name || "Applicant") as string,
    applications: applicationRoles.map((role) => {
      const row = rows.find((candidate) => candidate.role === role);
      return row ? { id: row.id as string, role, status: row.status as ApplicationSummary["status"], progress: row.status === "draft" ? 25 : 100 } : { id: null, role, status: "not_started", progress: 0 };
    }),
    databaseAvailable: !appResult.error,
  };
}
