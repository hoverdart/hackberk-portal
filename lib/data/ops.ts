import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getOpsHub(userId: string, eventId: string) {
  const supabase = await createClient();
  const [{ data: applications }, { data: milestones }, { data: projectAssignments }, { data: mentorRequests }, { data: shifts }, { data: shiftAssignments }, { data: staff }] = await Promise.all([
    supabase.from("applications").select("role,status").eq("event_id", eventId).eq("applicant_id", userId),
    supabase.from("event_milestones").select("id,audience,title,description,due_at").eq("event_id", eventId).order("due_at"),
    supabase.from("project_review_assignments").select("id,project_id,projects(name,summary)").eq("judge_id", userId),
    supabase.from("mentor_requests").select("id,title,description,expertise_tags,status,claimed_by,created_at").eq("event_id", eventId).order("created_at"),
    supabase.from("volunteer_shifts").select("id,title,location,starts_at,ends_at,capacity,checklist").eq("event_id", eventId).order("starts_at"),
    supabase.from("volunteer_shift_assignments").select("shift_id,checked_in_at,checklist_state").eq("volunteer_id", userId),
    supabase.from("staff_members").select("role").eq("event_id", eventId).eq("user_id", userId),
  ]);
  return { applications: applications ?? [], milestones: milestones ?? [], projectAssignments: projectAssignments ?? [], mentorRequests: mentorRequests ?? [], shifts: shifts ?? [], shiftAssignments: shiftAssignments ?? [], staff: staff ?? [] };
}
